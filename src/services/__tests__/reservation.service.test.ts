import { Types } from 'mongoose';
import Reservation from '../../models/Reservation.model';
import Resource from '../../models/Resource.model';
import User from '../../models/User';
import { ServiceError } from '../../errors/service-error';
import {
  cancelReservation,
  createReservation,
  getReservationsByUser,
} from '../reservation.service';
import type {
  CreateReservationRequest,
  Reservation as ReservationResponse,
  ReservationStatus,
} from '../../../shared/api';

// Database-backed service tests: src/test/setup.ts isolates each suite and test.
// Resources are created through the model because no creation service exists.
const resourceId = new Types.ObjectId().toString();
const otherResourceId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();
const otherUserId = new Types.ObjectId().toString();
const missingId = new Types.ObjectId().toString();

type ReservationFixture = Partial<CreateReservationRequest> & { status?: ReservationStatus };

const input = (overrides: Partial<CreateReservationRequest> = {}): CreateReservationRequest => ({
  resourceId,
  userId,
  startTime: '2026-11-09T10:00:00.000Z',
  endTime: '2026-11-09T11:00:00.000Z',
  ...overrides,
});

const seedReservation = async (overrides: ReservationFixture = {}): Promise<string> => {
  const reservation = await Reservation.create({ ...input(), status: 'PENDING', ...overrides });
  return reservation._id.toString();
};

const expectUnchangedResource = async (): Promise<void> => {
  const resource = await Resource.findById(resourceId)
    .select('+reservationVersion')
    .orFail()
    .exec();
  expect(resource.reservationVersion).toBe(0);
};

beforeEach(async (): Promise<void> => {
  await Resource.insertMany([
    { _id: resourceId, name: 'Library Room', type: 'ROOM', location: 'Library' },
    { _id: otherResourceId, name: 'Camera', type: 'EQUIPMENT', location: 'Media Center' },
  ]);
  await User.insertMany([
    { _id: userId, name: 'Student One', email: 'one@example.test' },
    { _id: otherUserId, name: 'Student Two', email: 'two@example.test' },
  ]);
});

describe('createReservation happy paths', (): void => {
  it('persists a newly created resource and places a reservation for it', async (): Promise<void> => {
    const resource = await Resource.create({
      name: '  Study Room  ',
      type: 'ROOM',
      location: '  Library Floor 2  ',
    });
    const stored = await Resource.findById(resource._id).orFail().exec();
    expect(stored.name).toBe('Study Room');
    expect(stored.location).toBe('Library Floor 2');
    expect(stored.isAvailable).toBe(true);

    const result = await createReservation(input({ resourceId: resource._id.toString() }));
    expect(result.resourceId).toBe(stored._id.toString());
    expect(await Reservation.countDocuments({ resourceId: resource._id })).toBe(1);
  });

  it('returns the public DTO and persists a pending reservation', async (): Promise<void> => {
    const result = await createReservation(input());
    expect(result).toEqual({ ...input(), id: expect.any(String), status: 'PENDING' });
    expect(Types.ObjectId.isValid(result.id)).toBe(true);
    const stored = await Reservation.findById(result.id).orFail().exec();
    expect(stored.resourceId.toString()).toBe(resourceId);
    expect(stored.userId.toString()).toBe(userId);
    expect(stored.startTime.toISOString()).toBe(result.startTime);
    expect(stored.endTime.toISOString()).toBe(result.endTime);
    expect(stored.status).toBe('PENDING');
    expect(await Reservation.countDocuments()).toBe(1);
  });

  it('normalizes valid timezone offsets to UTC in the response', async (): Promise<void> => {
    const result = await createReservation(
      input({ startTime: '2026-11-09T02:00:00-08:00', endTime: '2026-11-09T03:00:00-08:00' }),
    );
    expect(result.startTime).toBe(input().startTime);
    expect(result.endTime).toBe(input().endTime);
  });

  it('allows a valid reservation lasting one millisecond', async (): Promise<void> => {
    const result = await createReservation(input({ endTime: '2026-11-09T10:00:00.001Z' }));
    expect(new Date(result.endTime).getTime() - new Date(result.startTime).getTime()).toBe(1);
    expect(await Reservation.countDocuments()).toBe(1);
  });

  it('allows overlapping reservations on different resources', async (): Promise<void> => {
    await seedReservation();
    const result = await createReservation(input({ resourceId: otherResourceId }));
    expect(result.resourceId).toBe(otherResourceId);
    expect(await Reservation.countDocuments()).toBe(2);
  });

  it('allows reuse of a cancelled reservation time', async (): Promise<void> => {
    await seedReservation({ status: 'CANCELLED' });
    const result = await createReservation(input());
    expect(result.status).toBe('PENDING');
    expect(await Reservation.countDocuments()).toBe(2);
  });

  it.each([
    ['before', '2026-11-09T09:00:00.000Z', '2026-11-09T10:00:00.000Z'],
    ['after', '2026-11-09T11:00:00.000Z', '2026-11-09T12:00:00.000Z'],
  ])(
    'allows a booking immediately %s an existing booking',
    async (_position: string, startTime: string, endTime: string): Promise<void> => {
      await seedReservation();
      const result = await createReservation(input({ startTime, endTime }));
      expect(result).toMatchObject({ startTime, endTime, status: 'PENDING' });
      expect(await Reservation.countDocuments()).toBe(2);
    },
  );
});

describe.each(['PENDING', 'CONFIRMED'] as const)(
  'createReservation conflicts with %s reservations',
  (status: 'PENDING' | 'CONFIRMED'): void => {
    it.each([
      ['identical start and end', '2026-11-09T10:00:00.000Z', '2026-11-09T11:00:00.000Z'],
      ['same start', '2026-11-09T10:00:00.000Z', '2026-11-09T10:30:00.000Z'],
      ['same end', '2026-11-09T10:30:00.000Z', '2026-11-09T11:00:00.000Z'],
      ['partial overlap before', '2026-11-09T09:30:00.000Z', '2026-11-09T10:30:00.000Z'],
      ['partial overlap after', '2026-11-09T10:30:00.000Z', '2026-11-09T11:30:00.000Z'],
      ['contained interval', '2026-11-09T10:15:00.000Z', '2026-11-09T10:45:00.000Z'],
      ['enclosing interval', '2026-11-09T09:00:00.000Z', '2026-11-09T12:00:00.000Z'],
      ['one millisecond at start', '2026-11-09T09:00:00.000Z', '2026-11-09T10:00:00.001Z'],
      ['one millisecond at end', '2026-11-09T10:59:59.999Z', '2026-11-09T12:00:00.000Z'],
    ])(
      'rejects %s and rolls back resource changes',
      async (_scenario: string, startTime: string, endTime: string): Promise<void> => {
        const existingId = await seedReservation({ status, userId: otherUserId });
        await expect(createReservation(input({ startTime, endTime }))).rejects.toMatchObject({
          name: 'ServiceError',
          code: 'DOUBLE_BOOKING',
          message: 'Resource is already reserved for this time slot.',
        });
        expect(await Reservation.countDocuments()).toBe(1);
        expect((await Reservation.findById(existingId).orFail().exec()).status).toBe(status);
        await expectUnchangedResource();
      },
    );
  },
);

describe('createReservation failures and atomicity', (): void => {
  it.each([
    ['equal endpoints', '2026-11-09T10:00:00.000Z'],
    ['end before start', '2026-11-09T09:00:00.000Z'],
    ['end one millisecond before start', '2026-11-09T09:59:59.999Z'],
  ])(
    'rejects %s before accessing resources',
    async (_scenario: string, endTime: string): Promise<void> => {
      const lookup = jest.spyOn(Resource, 'findOneAndUpdate');
      await expect(createReservation(input({ endTime }))).rejects.toMatchObject({
        name: 'ServiceError',
        code: 'INVALID_TIME_RANGE',
        message: 'startTime must be before endTime.',
      });
      expect(lookup).not.toHaveBeenCalled();
      expect(await Reservation.countDocuments()).toBe(0);
      await expectUnchangedResource();
    },
  );

  it('rejects a non-existent resource identifier without inserting', async (): Promise<void> => {
    await expect(createReservation(input({ resourceId: missingId }))).rejects.toMatchObject({
      name: 'ServiceError',
      code: 'RESOURCE_NOT_FOUND',
      message: 'Resource not found.',
    });
    expect(await Resource.exists({ _id: missingId })).toBeNull();
    expect(await Reservation.countDocuments()).toBe(0);
    await expectUnchangedResource();
  });

  it('rejects a non-existent user and rolls back the resource update', async (): Promise<void> => {
    await expect(createReservation(input({ userId: missingId }))).rejects.toMatchObject({
      name: 'ServiceError',
      code: 'USER_NOT_FOUND',
      message: 'User not found.',
    });
    expect(await Reservation.countDocuments()).toBe(0);
    await expectUnchangedResource();
  });

  it('detects overlap when timestamps use different timezone offsets', async (): Promise<void> => {
    await seedReservation();
    await expect(
      createReservation(
        input({ startTime: '2026-11-09T02:30:00-08:00', endTime: '2026-11-09T03:30:00-08:00' }),
      ),
    ).rejects.toMatchObject({ code: 'DOUBLE_BOOKING' });
    expect(await Reservation.countDocuments()).toBe(1);
    await expectUnchangedResource();
  });

  it('propagates a persistence failure and rolls back the transaction', async (): Promise<void> => {
    const failure = new Error('Simulated reservation persistence failure');
    jest.spyOn(Reservation.prototype, 'save').mockRejectedValueOnce(failure);
    await expect(createReservation(input())).rejects.toBe(failure);
    expect(await Reservation.countDocuments()).toBe(0);
    await expectUnchangedResource();
  });

  it('creates exactly one reservation when eight callers compete for the same slot', async (): Promise<void> => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (): Promise<ReservationResponse> => createReservation(input())),
    );
    const successes = results.filter(
      (result: PromiseSettledResult<ReservationResponse>): boolean => result.status === 'fulfilled',
    );
    expect(successes).toHaveLength(1);
    for (const result of results) {
      if (result.status === 'rejected') {
        const reason: unknown = result.reason;
        expect(reason).toBeInstanceOf(ServiceError);
        expect(reason).toMatchObject({ code: 'DOUBLE_BOOKING' });
      }
    }
    expect(await Reservation.countDocuments()).toBe(1);
    const resource = await Resource.findById(resourceId)
      .select('+reservationVersion')
      .orFail()
      .exec();
    expect(resource.reservationVersion).toBe(1);
  });
});

describe('cancelReservation', (): void => {
  it.each(['PENDING', 'CONFIRMED', 'CANCELLED'] as const)(
    'cancels a %s reservation, preserves its fields, and allows rebooking',
    async (status: ReservationStatus): Promise<void> => {
      const id = await seedReservation({ status });
      const result = await cancelReservation(id);
      expect(result).toEqual({ ...input(), id, status: 'CANCELLED' });
      expect((await Reservation.findById(id).orFail().exec()).status).toBe('CANCELLED');
      expect(await Reservation.countDocuments()).toBe(1);
      const replacement = await createReservation(input());
      expect(replacement.status).toBe('PENDING');
      expect(replacement.id).not.toBe(id);
    },
  );

  it('returns the same response for repeated cancellations', async (): Promise<void> => {
    const id = await seedReservation();
    const first = await cancelReservation(id);
    await expect(cancelReservation(id)).resolves.toEqual(first);
    expect(await Reservation.countDocuments()).toBe(1);
  });

  it('handles concurrent cancellations without creating extra records', async (): Promise<void> => {
    const id = await seedReservation();
    const results = await Promise.all(
      Array.from({ length: 4 }, (): Promise<ReservationResponse> => cancelReservation(id)),
    );
    expect(results).toEqual(
      Array.from({ length: 4 }, (): ReservationResponse => ({
        ...input(),
        id,
        status: 'CANCELLED',
      })),
    );
    expect(await Reservation.countDocuments()).toBe(1);
    expect((await Reservation.findById(id).orFail().exec()).status).toBe('CANCELLED');
  });

  it('rejects a non-existent reservation without changing another booking', async (): Promise<void> => {
    const existingId = await seedReservation();
    await expect(cancelReservation(missingId)).rejects.toMatchObject({
      name: 'ServiceError',
      code: 'RESERVATION_NOT_FOUND',
      message: 'Reservation not found.',
    });
    expect(await Reservation.countDocuments()).toBe(1);
    expect((await Reservation.findById(existingId).orFail().exec()).status).toBe('PENDING');
  });
});

describe('getReservationsByUser', (): void => {
  it('returns an empty list for a user without reservations', async (): Promise<void> => {
    await seedReservation({ userId: otherUserId });
    await expect(getReservationsByUser(userId)).resolves.toEqual([]);
  });

  it('returns all statuses, filters other users, and sorts by time and identifier', async (): Promise<void> => {
    const pendingId = await seedReservation();
    const cancelledId = await seedReservation({ status: 'CANCELLED' });
    const earlierId = await seedReservation({
      status: 'CONFIRMED',
      startTime: '2026-11-09T08:00:00.000Z',
      endTime: '2026-11-09T09:00:00.000Z',
    });
    await seedReservation({ userId: otherUserId });

    const results = await getReservationsByUser(userId);
    expect(results.map((result: ReservationResponse): string => result.id)).toEqual([
      earlierId,
      ...[pendingId, cancelledId].sort(),
    ]);
    expect(results).toHaveLength(3);
    expect(
      results.map((result: ReservationResponse): ReservationStatus => result.status).sort(),
    ).toEqual(['CANCELLED', 'CONFIRMED', 'PENDING']);
    for (const result of results) {
      expect(result.userId).toBe(userId);
      expect(Object.keys(result).sort()).toEqual([
        'endTime',
        'id',
        'resourceId',
        'startTime',
        'status',
        'userId',
      ]);
      expect(result.startTime).toBe(new Date(result.startTime).toISOString());
      expect(result.endTime).toBe(new Date(result.endTime).toISOString());
    }
  });
});
