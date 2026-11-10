import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import supertest from 'supertest';
import { app } from '../../app';
import Reservation from '../../models/Reservation.model';
import Resource from '../../models/Resource.model';
import User from '../../models/User';
import type { CreateReservationRequest, ReservationStatus } from '../../../shared/api';

interface HttpResult {
  status: number;
  body: unknown;
}

const studentId = new Types.ObjectId();
const otherStudentId = new Types.ObjectId();
const roomId = new Types.ObjectId();
const otherRoomId = new Types.ObjectId();
const equipmentId = new Types.ObjectId();
const labId = new Types.ObjectId();
const missingId = new Types.ObjectId().toString();

const asObject = (value: unknown): Record<string, unknown> => {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
};

const asList = (value: unknown): Record<string, unknown>[] => {
  assert.ok(Array.isArray(value));
  return value.map((item: unknown): Record<string, unknown> => asObject(item));
};

const request = async (
  path: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: unknown,
): Promise<HttpResult> => {
  const client = supertest(app);
  const url = `/api/v1${path}`;
  const pendingRequest =
    method === 'POST' ? client.post(url) : method === 'PATCH' ? client.patch(url) : client.get(url);
  if (body !== undefined) {
    pendingRequest.set('Content-Type', 'application/json').send(JSON.stringify(body));
  }
  const response = await pendingRequest;
  const result: unknown = response.body;
  return { status: response.status, body: result };
};

const input = (overrides: Partial<CreateReservationRequest> = {}): CreateReservationRequest => ({
  resourceId: roomId.toString(),
  userId: studentId.toString(),
  startTime: '2026-11-02T10:00:00Z',
  endTime: '2026-11-02T11:00:00Z',
  ...overrides,
});

const seedBooking = async (
  status: ReservationStatus = 'PENDING',
  userId: Types.ObjectId = studentId,
): Promise<string> => {
  const booking = await Reservation.create({
    resourceId: roomId,
    userId,
    startTime: new Date('2026-11-02T10:00:00Z'),
    endTime: new Date('2026-11-02T11:00:00Z'),
    status,
  });
  return booking._id.toString();
};

beforeEach(async (): Promise<void> => {
  await Resource.insertMany([
    { _id: roomId, name: 'A Room', type: 'ROOM', isAvailable: true, location: 'Library' },
    { _id: otherRoomId, name: 'B Room', type: 'ROOM', isAvailable: false, location: 'Library' },
    { _id: equipmentId, name: 'C Camera', type: 'EQUIPMENT', isAvailable: true, location: 'Media' },
    { _id: labId, name: 'D Lab', type: 'LAB', isAvailable: false, location: 'Science' },
  ]);
  await User.insertMany([
    { _id: studentId, name: 'Student One', email: 'student-one@example.test' },
    { _id: otherStudentId, name: 'Student Two', email: 'student-two@example.test' },
  ]);
});

describe('resource retrieval and existing health endpoint', (): void => {
  it('returns a structured 500 without exposing internal errors', async (): Promise<void> => {
    jest.spyOn(Resource, 'find').mockImplementation((): never => {
      throw new Error('Internal database failure details');
    });

    const result = await request('/resources');
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error.',
    });
  });

  it('keeps the health endpoint working', async (): Promise<void> => {
    const result = await request('/health');
    assert.equal(result.status, 200);
    assert.equal(asObject(result.body).status, 'ok');
  });

  it('lists resources sorted by name with the documented fields', async (): Promise<void> => {
    const result = await request('/resources');
    assert.equal(result.status, 200);
    const resources = asList(result.body);
    assert.deepEqual(
      resources.map((item): unknown => item.name),
      ['A Room', 'B Room', 'C Camera', 'D Lab'],
    );
    assert.deepEqual(Object.keys(resources[0]).sort(), [
      'id',
      'isAvailable',
      'location',
      'name',
      'type',
    ]);
  });

  for (const [query, expectedNames] of [
    ['type=ROOM', ['A Room', 'B Room']],
    ['type=EQUIPMENT', ['C Camera']],
    ['type=LAB', ['D Lab']],
    ['isAvailable=true', ['A Room', 'C Camera']],
    ['isAvailable=false', ['B Room', 'D Lab']],
    ['type=ROOM&isAvailable=false', ['B Room']],
    ['type=LAB&isAvailable=true', []],
    ['type=%20ROOM%20&isAvailable=true', ['A Room']],
  ] as const) {
    it(`filters resources using ${query}`, async (): Promise<void> => {
      const result = await request(`/resources?${query}`);
      assert.equal(result.status, 200);
      assert.deepEqual(
        asList(result.body).map((item): unknown => item.name),
        expectedNames,
      );
    });
  }

  for (const query of [
    'type=OTHER',
    'type=',
    'isAvailable=1',
    'isAvailable=',
    'type=ROOM&type=LAB',
    'isAvailable=true&isAvailable=false',
    'unknown=value',
  ]) {
    it(`rejects invalid filters: ${query}`, async (): Promise<void> => {
      const result = await request(`/resources?${query}`);
      assert.equal(result.status, 400);
      assert.equal(asObject(result.body).code, 'INVALID_REQUEST');
    });
  }
});

describe('reservation creation', (): void => {
  it('creates, lists, rejects a conflict, cancels, and rebooks through HTTP', async (): Promise<void> => {
    const created = await request('/reservations', 'POST', input());
    assert.equal(created.status, 201);
    const booking = asObject(created.body);
    assert.equal(typeof booking.id, 'string');

    const history = await request(`/reservations/user/${studentId}`);
    assert.equal(history.status, 200);
    assert.deepEqual(history.body, [booking]);

    const conflict = await request('/reservations', 'POST', input());
    assert.equal(conflict.status, 409);
    assert.deepEqual(conflict.body, {
      code: 'DOUBLE_BOOKING',
      message: 'Resource is already reserved for this time slot.',
    });
    assert.equal(await Reservation.countDocuments(), 1);

    const cancelled = await request(`/reservations/${booking.id}/cancel`, 'PATCH');
    assert.equal(cancelled.status, 200);
    assert.deepEqual(cancelled.body, { ...booking, status: 'CANCELLED' });

    const replacement = await request('/reservations', 'POST', input());
    assert.equal(replacement.status, 201);
    assert.notEqual(asObject(replacement.body).id, booking.id);
    const finalHistory = await request(`/reservations/user/${studentId}`);
    assert.equal(finalHistory.status, 200);
    assert.deepEqual(
      asList(finalHistory.body)
        .map((item: Record<string, unknown>): unknown => item.status)
        .sort(),
      ['CANCELLED', 'PENDING'],
    );
  });

  it('creates a pending reservation with stable public fields', async (): Promise<void> => {
    const result = await request('/reservations', 'POST', input());
    assert.equal(result.status, 201);
    const reservation = asObject(result.body);
    assert.equal(reservation.status, 'PENDING');
    assert.equal(reservation.resourceId, roomId.toString());
    assert.equal(reservation.userId, studentId.toString());
    assert.equal(reservation.startTime, '2026-11-02T10:00:00.000Z');
    assert.equal(reservation.endTime, '2026-11-02T11:00:00.000Z');
    assert.deepEqual(Object.keys(reservation).sort(), [
      'endTime',
      'id',
      'resourceId',
      'startTime',
      'status',
      'userId',
    ]);
  });

  for (const status of ['PENDING', 'CONFIRMED'] as const) {
    for (const [startTime, endTime] of [
      ['2026-11-02T09:30:00Z', '2026-11-02T10:30:00Z'],
      ['2026-11-02T10:30:00Z', '2026-11-02T11:30:00Z'],
      ['2026-11-02T10:15:00Z', '2026-11-02T10:45:00Z'],
      ['2026-11-02T09:00:00Z', '2026-11-02T12:00:00Z'],
      ['2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z'],
      ['2026-11-02T09:00:00Z', '2026-11-02T10:00:00.001Z'],
      ['2026-11-02T10:59:59.999Z', '2026-11-02T12:00:00Z'],
    ]) {
      it(`rejects overlap ${startTime}–${endTime} with ${status}`, async (): Promise<void> => {
        await seedBooking(status, otherStudentId);
        const result = await request('/reservations', 'POST', input({ startTime, endTime }));
        assert.equal(result.status, 409);
        assert.equal(asObject(result.body).code, 'DOUBLE_BOOKING');
        assert.equal(await Reservation.countDocuments(), 1);
      });
    }
  }

  for (const [startTime, endTime] of [
    ['2026-11-02T09:00:00Z', '2026-11-02T10:00:00Z'],
    ['2026-11-02T11:00:00Z', '2026-11-02T12:00:00Z'],
    ['2026-11-02T09:59:59.999Z', '2026-11-02T10:00:00Z'],
    ['2026-11-02T11:00:00Z', '2026-11-02T11:00:00.001Z'],
  ]) {
    it(`allows an adjacent booking ${startTime}–${endTime}`, async (): Promise<void> => {
      await seedBooking();
      const result = await request('/reservations', 'POST', input({ startTime, endTime }));
      assert.equal(result.status, 201);
    });
  }

  it('compares timestamps by instant across timezone offsets', async (): Promise<void> => {
    await seedBooking();
    const result = await request(
      '/reservations',
      'POST',
      input({
        startTime: '2026-11-02T02:30:00-08:00',
        endTime: '2026-11-02T03:30:00-08:00',
      }),
    );
    assert.equal(result.status, 409);
  });

  it('allows an overlapping time on a different resource', async (): Promise<void> => {
    await seedBooking();
    const result = await request(
      '/reservations',
      'POST',
      input({ resourceId: equipmentId.toString() }),
    );
    assert.equal(result.status, 201);
  });

  it('ignores cancelled bookings during conflict checks', async (): Promise<void> => {
    await seedBooking('CANCELLED');
    const result = await request('/reservations', 'POST', input());
    assert.equal(result.status, 201);
  });

  it('creates exactly one booking under simultaneous requests', async (): Promise<void> => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (): Promise<HttpResult> =>
        request('/reservations', 'POST', input()),
      ),
    );
    assert.equal(results.filter((result): boolean => result.status === 201).length, 1);
    assert.equal(results.filter((result): boolean => result.status === 409).length, 7);
    assert.equal(await Reservation.countDocuments(), 1);
  });

  const invalidBodies: unknown[] = [
    null,
    [],
    {},
    input({ resourceId: 'invalid' }),
    input({ userId: 'invalid' }),
    input({ startTime: 'not-a-date' }),
    input({ startTime: '2026-02-30T10:00:00Z' }),
    input({ startTime: '2026-11-02T10:00:00' }),
    input({ endTime: '2026-11-02T10:00:00Z' }),
    input({ endTime: '2026-11-02T09:00:00Z' }),
    { ...input(), status: 'CONFIRMED' },
    { ...input(), userId: 123 },
  ];

  for (const field of ['resourceId', 'userId', 'startTime', 'endTime'] as const) {
    it(`rejects a missing ${field} with a structured validation error`, async (): Promise<void> => {
      const body: Partial<CreateReservationRequest> = input();
      delete body[field];
      const result = await request('/reservations', 'POST', body);
      assert.equal(result.status, 400);
      assert.equal(asObject(result.body).code, 'INVALID_REQUEST');
      assert.equal(typeof asObject(result.body).message, 'string');
      assert.equal(await Reservation.countDocuments(), 0);
    });
  }

  invalidBodies.forEach((body: unknown, index: number): void => {
    it(`rejects invalid payload ${index + 1} without inserting`, async (): Promise<void> => {
      const result = await request('/reservations', 'POST', body);
      assert.equal(result.status, 400);
      assert.equal(typeof asObject(result.body).code, 'string');
      assert.equal(await Reservation.countDocuments(), 0);
    });
  });

  for (const [field, code] of [
    ['resourceId', 'RESOURCE_NOT_FOUND'],
    ['userId', 'USER_NOT_FOUND'],
  ] as const) {
    it(`returns 404 for a missing ${field}`, async (): Promise<void> => {
      const result = await request('/reservations', 'POST', input({ [field]: missingId }));
      assert.equal(result.status, 404);
      assert.equal(asObject(result.body).code, code);
      assert.equal(await Reservation.countDocuments(), 0);
    });
  }

  it('returns structured errors for malformed JSON', async (): Promise<void> => {
    const response = await supertest(app)
      .post('/api/v1/reservations')
      .set('Content-Type', 'application/json')
      .send('{');
    const body: unknown = response.body;
    assert.equal(response.status, 400);
    assert.equal(asObject(body).code, 'INVALID_JSON');
  });
});

describe('user reservation history', (): void => {
  it('includes every status, excludes other users, and sorts chronologically', async (): Promise<void> => {
    await seedBooking('PENDING');
    const confirmed = await seedBooking('CONFIRMED');
    await Reservation.updateOne(
      { _id: confirmed },
      { $set: { startTime: new Date('2026-11-02T08:00:00Z') } },
    );
    await seedBooking('CANCELLED');
    await seedBooking('PENDING', otherStudentId);
    const result = await request(`/reservations/user/${studentId}`);
    assert.equal(result.status, 200);
    const bookings = asList(result.body);
    assert.equal(bookings.length, 3);
    assert.ok(bookings.every((booking): boolean => booking.userId === studentId.toString()));
    assert.deepEqual(
      bookings.map((booking): unknown => booking.status),
      ['CONFIRMED', 'PENDING', 'CANCELLED'],
    );
  });

  it('returns an empty list when a user has no bookings', async (): Promise<void> => {
    const result = await request(`/reservations/user/${missingId}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, []);
  });

  it('rejects an invalid user identifier', async (): Promise<void> => {
    const result = await request('/reservations/user/invalid');
    assert.equal(result.status, 400);
  });
});

describe('reservation cancellation', (): void => {
  for (const status of ['PENDING', 'CONFIRMED', 'CANCELLED'] as const) {
    it(`cancels a ${status} booking and immediately allows rebooking`, async (): Promise<void> => {
      const id = await seedBooking(status);
      const result = await request(`/reservations/${id}/cancel`, 'PATCH');
      assert.equal(result.status, 200);
      assert.equal(asObject(result.body).id, id);
      assert.equal(asObject(result.body).status, 'CANCELLED');
      assert.equal((await Reservation.findById(id).orFail().exec()).status, 'CANCELLED');
      const replacement = await request('/reservations', 'POST', input());
      assert.equal(replacement.status, 201);
    });
  }

  it('handles repeated concurrent cancellations safely', async (): Promise<void> => {
    const id = await seedBooking();
    const results = await Promise.all(
      Array.from({ length: 4 }, (): Promise<HttpResult> =>
        request(`/reservations/${id}/cancel`, 'PATCH'),
      ),
    );
    for (const result of results) {
      assert.equal(result.status, 200);
      assert.equal(asObject(result.body).status, 'CANCELLED');
    }
    assert.equal(await Reservation.countDocuments(), 1);
  });

  it('returns 404 for a missing reservation', async (): Promise<void> => {
    const result = await request(`/reservations/${missingId}/cancel`, 'PATCH');
    assert.equal(result.status, 404);
    assert.equal(asObject(result.body).code, 'RESERVATION_NOT_FOUND');
  });

  it('returns 400 for an invalid reservation identifier', async (): Promise<void> => {
    const result = await request('/reservations/invalid/cancel', 'PATCH');
    assert.equal(result.status, 400);
  });
});
