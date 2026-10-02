import { z } from 'zod';
import Reservation from '../models/Reservation';
import Resource from '../models/Resource';
import User from '../models/User';

const createReservationSchema = z
  .object({
    resourceId: z.string().min(1, 'resourceId is required'),
    userId: z.string().min(1, 'userId is required'),
    startTime: z.string().min(1, 'startTime is required'),
    endTime: z.string().min(1, 'endTime is required'),
  })
  .strict();

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

const parseDate = (value: string, fieldName: string): Date => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createReservationError(400, `${fieldName} must be a valid date.`);
  }

  return date;
};

export const createReservation = async (body: unknown) => {
  const parsedBody = createReservationSchema.safeParse(body);

  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    throw createReservationError(400, issue?.message ?? 'Invalid reservation payload.');
  }

  const { resourceId, userId, startTime, endTime } = parsedBody.data;

  const start = parseDate(startTime, 'startTime');
  const end = parseDate(endTime, 'endTime');

  if (start >= end) {
    throw createReservationError(400, 'startTime must be before endTime.');
  }

  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw createReservationError(404, 'Resource not found.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createReservationError(404, 'User not found.');
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
      'The resource is already reserved during the requested time block.',
      'RESERVATION_CONFLICT'
    );
  }

  const reservation = await Reservation.create({
    resourceId,
    userId,
    startTime: start,
    endTime: end,
    status: 'PENDING',
  });

  return reservation;
};
