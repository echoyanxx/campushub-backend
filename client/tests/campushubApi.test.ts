import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { TestContext } from 'node:test';
import {
  ApiError,
  cancelReservation,
  createReservation,
  fetchResources,
  fetchUserReservations,
} from '../src/api/campushubApi.ts';
import type { CreateReservationDTO, Reservation, Resource } from '../src/api/types.ts';

const originalFetch = globalThis.fetch;
const userId = '507f1f77bcf86cd799439011';
const resourceId = '507f1f77bcf86cd799439012';
const reservationId = '507f1f77bcf86cd799439013';
const payload: CreateReservationDTO = {
  resourceId,
  userId,
  startTime: '2026-11-02T10:00:00Z',
  endTime: '2026-11-02T11:00:00Z',
};
const reservation: Reservation = { ...payload, id: reservationId, status: 'PENDING' };
const resource: Resource = {
  id: resourceId,
  name: 'Library study room',
  type: 'ROOM',
  isAvailable: true,
  location: 'Library, floor 2',
};

interface RecordedRequest {
  url: string;
  options: RequestInit;
}

const respondWith = (body: unknown, status: number = 200): RecordedRequest[] => {
  const requests: RecordedRequest[] = [];
  globalThis.fetch = async (
    input: string | URL | Request,
    options: RequestInit = {},
  ): Promise<Response> => {
    requests.push({ url: String(input), options });
    return Response.json(body, { status });
  };
  return requests;
};

afterEach((): void => {
  globalThis.fetch = originalFetch;
});

test('lists resources using the documented fields and optional filter', async (): Promise<void> => {
  const requests = respondWith([resource]);
  assert.deepEqual(await fetchResources(), [resource]);
  assert.deepEqual(await fetchResources('ROOM'), [resource]);
  assert.equal(requests[0]?.url, '/api/v1/resources');
  assert.equal(requests[1]?.url, '/api/v1/resources?type=ROOM');
});

test('posts the DTO as JSON and returns the pending reservation', async (): Promise<void> => {
  const requests = respondWith(reservation, 201);
  assert.deepEqual(await createReservation(payload), reservation);
  assert.equal(requests[0]?.url, '/api/v1/reservations');
  assert.equal(requests[0]?.options.method, 'POST');
  assert.equal(new Headers(requests[0]?.options.headers).get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(String(requests[0]?.options.body)), payload);
});

test('uses the user path and permits an empty reservation list', async (): Promise<void> => {
  const requests = respondWith([]);
  assert.deepEqual(await fetchUserReservations(userId), []);
  assert.equal(requests[0]?.url, `/api/v1/reservations/user/${userId}`);
});

test('cancels with PATCH and no request body', async (): Promise<void> => {
  const cancelled: Reservation = { ...reservation, status: 'CANCELLED' };
  const requests = respondWith(cancelled);
  assert.deepEqual(await cancelReservation(reservationId), cancelled);
  assert.equal(requests[0]?.url, `/api/v1/reservations/${reservationId}/cancel`);
  assert.equal(requests[0]?.options.method, 'PATCH');
  assert.equal(requests[0]?.options.body, undefined);
});

test('preserves the conflict status, code, and message for form banners', async (): Promise<void> => {
  respondWith(
    { code: 'DOUBLE_BOOKING', message: 'Resource is already reserved for this time slot.' },
    409,
  );
  await assert.rejects(createReservation(payload), (error: unknown): boolean => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, 'DOUBLE_BOOKING');
    assert.equal(error.message, 'Resource is already reserved for this time slot.');
    return true;
  });
});

test('preserves not-found errors', async (): Promise<void> => {
  respondWith({ code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found.' }, 404);
  await assert.rejects(cancelReservation(reservationId), {
    status: 404,
    code: 'RESERVATION_NOT_FOUND',
  });
});

test('rejects invalid filters, identifiers, timestamps, and time ranges before sending', async (): Promise<void> => {
  const requests = respondWith(reservation);
  await assert.rejects(fetchResources('room'), { code: 'INVALID_REQUEST' });
  await assert.rejects(fetchUserReservations('../resources'), { code: 'INVALID_REQUEST' });
  await assert.rejects(cancelReservation(''), { code: 'INVALID_REQUEST' });
  await assert.rejects(createReservation({ ...payload, startTime: 'tomorrow' }), {
    code: 'INVALID_REQUEST',
  });
  await assert.rejects(createReservation({ ...payload, endTime: payload.startTime }), {
    code: 'INVALID_TIME_RANGE',
  });
  assert.equal(requests.length, 0);
});

test('detects schema drift instead of returning incompatible resource props', async (): Promise<void> => {
  respondWith([
    {
      id: resourceId,
      name: 'Old room',
      resourceType: 'ROOM',
      available: true,
      location: 'Library',
    },
  ]);
  await assert.rejects(fetchResources(), { code: 'INVALID_RESPONSE' });
  respondWith([{ ...reservation, status: 'ACTIVE' }]);
  await assert.rejects(fetchUserReservations(userId), { code: 'INVALID_RESPONSE' });
  respondWith([{ ...resource, type: ['ROOM'] }]);
  await assert.rejects(fetchResources(), { code: 'INVALID_RESPONSE' });
});

test('handles HTML responses from an unavailable development proxy', async (): Promise<void> => {
  globalThis.fetch = async (): Promise<Response> => new Response('Bad gateway', { status: 502 });
  await assert.rejects(fetchResources(), { status: 502, code: 'INVALID_RESPONSE' });
});

test('turns network failures into a structured API error', async (): Promise<void> => {
  globalThis.fetch = async (): Promise<Response> => {
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(fetchResources(), { status: 0, code: 'NETWORK_ERROR' });
});

test('passes through abort signals and preserves cancellation', async (): Promise<void> => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (
    _input: string | URL | Request,
    options?: RequestInit,
  ): Promise<Response> => {
    assert.equal(options?.signal?.aborted, true);
    throw new DOMException('Aborted', 'AbortError');
  };
  await assert.rejects(fetchResources(undefined, controller.signal), { name: 'AbortError' });
  await assert.rejects(fetchUserReservations(userId, controller.signal), { name: 'AbortError' });
});

test('bounds stalled requests and releases timeout timers after completion', async (context: TestContext): Promise<void> => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = async (
    _input: string | URL | Request,
    options?: RequestInit,
  ): Promise<Response> =>
    new Promise<Response>((_resolve, reject): void => {
      options?.signal?.addEventListener('abort', (): void => reject(options.signal?.reason), {
        once: true,
      });
    });
  const pending = assert.rejects(fetchResources(), { code: 'REQUEST_TIMEOUT' });
  context.mock.timers.tick(15_000);
  await pending;
  const requests = respondWith([resource]);
  assert.deepEqual(await fetchResources(), [resource]);
  assert.equal(requests[0]?.options.signal?.aborted, false);
  context.mock.timers.tick(15_000);
  assert.equal(requests[0]?.options.signal?.aborted, false);
});

test('propagates caller cancellation while a read is pending', async (): Promise<void> => {
  const controller = new AbortController();
  globalThis.fetch = async (
    _input: string | URL | Request,
    options?: RequestInit,
  ): Promise<Response> =>
    new Promise<Response>((_resolve, reject): void => {
      options?.signal?.addEventListener('abort', (): void => reject(options.signal?.reason), {
        once: true,
      });
    });
  const pending = assert.rejects(fetchUserReservations(userId, controller.signal), {
    name: 'AbortError',
  });
  controller.abort();
  await pending;
});

test('times out when response headers arrive but the JSON body stalls', async (context: TestContext): Promise<void> => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = async (
    _input: string | URL | Request,
    options?: RequestInit,
  ): Promise<Response> => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller: ReadableStreamDefaultController<Uint8Array>): void {
        options?.signal?.addEventListener(
          'abort',
          (): void => controller.error(options.signal?.reason),
          { once: true },
        );
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'application/json' } });
  };
  const pending = assert.rejects(fetchResources(), { code: 'REQUEST_TIMEOUT' });
  context.mock.timers.tick(15_000);
  await pending;
});
