import { z } from 'zod';
import Reservation from '../models/Reservation.model';
import Resource from '../models/Resource.model';
import User from '../models/User';

export interface ReservationServiceError {
  status: number;
  payload: {
    error?: string;
    message: string;
  };
}

const createReservationError = (status: number, message: string, error?: string): ReservationServiceError => ({
  status,
  payload: {
    ...(error ? { error } : {}),
    message,
  },
});

const createReservationSchema = z
  .object({
    resourceId: z.string().min(1, 'resourceId is required'),
    userId: z.string().min(1, 'userId is required'),
    startTime: z.string().min(1, 'startTime is required'),
    endTime: z.string().min(1, 'endTime is required'),
  })
  .strict();

const isValidIsoDateTime = (value: string): boolean => {
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
  return isoPattern.test(value) && !Number.isNaN(Date.parse(value));
};

export const getReservationsByUser = async (userId: string): Promise<unknown[]> => {
  return Reservation.find({
    userId,
    status: { $ne: 'CANCELLED' },
  })
    .sort({ startTime: 1 })
    .exec();
};

export const createReservation = async (body: unknown): Promise<unknown> => {
  const parsedBody = createReservationSchema.safeParse(body);

  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    throw createReservationError(400, issue?.message ?? 'Invalid reservation payload.');
  }

  const { resourceId, userId, startTime, endTime } = parsedBody.data;

  if (!isValidIsoDateTime(startTime) || !isValidIsoDateTime(endTime)) {
    throw createReservationError(400, 'startTime and endTime must be valid ISO 8601 date-time strings.', 'INVALID_DATE_TIME');
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) {
    throw createReservationError(400, 'startTime must be before endTime.', 'INVALID_TIME_RANGE');
  }

  const resource = await Resource.findById(resourceId).exec();
  if (!resource) {
    throw createReservationError(404, 'Resource not found.', 'RESOURCE_NOT_FOUND');
  }

  const user = await User.findById(userId).exec();
  if (!user) {
    throw createReservationError(404, 'User not found.', 'USER_NOT_FOUND');
  }

  const conflict = await Reservation.findOne({
    resourceId,
    status: { $ne: 'CANCELLED' },
    startTime: { $lt: end },
    endTime: { $gt: start },
  }).exec();

  if (conflict) {
    throw createReservationError(
      409,
      'Resource is already reserved for this time slot.',
      'DOUBLE_BOOKING'
    );
  }

  return Reservation.create({
    resourceId,
    userId,
    startTime: start,
    endTime: end,
    status: 'PENDING',
  });
};
