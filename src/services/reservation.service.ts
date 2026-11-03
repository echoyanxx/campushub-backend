import mongoose, { ClientSession, HydratedDocument } from 'mongoose';
import { ServiceError } from '../errors/service-error';
import Reservation, { IReservation } from '../models/Reservation.model';
import Resource from '../models/Resource.model';
import User from '../models/User';
import type {
  CreateReservationRequest,
  Reservation as ReservationResponse,
} from '../../shared/api';

const toReservationResponse = (
  reservation: HydratedDocument<IReservation>,
): ReservationResponse => ({
  id: reservation._id.toString(),
  resourceId: reservation.resourceId.toString(),
  userId: reservation.userId.toString(),
  startTime: reservation.startTime.toISOString(),
  endTime: reservation.endTime.toISOString(),
  status: reservation.status,
});

export const getReservationsByUser = async (userId: string): Promise<ReservationResponse[]> => {
  const reservations = await Reservation.find({ userId }).sort({ startTime: 1, _id: 1 }).exec();
  return reservations.map(toReservationResponse);
};

export const createReservation = async (
  input: CreateReservationRequest,
): Promise<ReservationResponse> => {
  const { resourceId, userId, startTime, endTime } = input;
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) {
    throw new ServiceError('INVALID_TIME_RANGE', 'startTime must be before endTime.');
  }

  return mongoose.connection.transaction(
    async (session: ClientSession): Promise<ReservationResponse> => {
      // A real write serializes competing creations for this resource. A transaction
      // containing only the overlap read and reservation insert would allow write skew.
      const resource = await Resource.findOneAndUpdate(
        { _id: resourceId },
        { $inc: { reservationVersion: 1 } },
        { session, returnDocument: 'after' },
      ).exec();

      if (!resource) {
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found.');
      }

      const user = await User.exists({ _id: userId }).session(session).exec();
      if (!user) {
        throw new ServiceError('USER_NOT_FOUND', 'User not found.');
      }

      const conflict = await Reservation.exists({
        resourceId,
        status: { $in: ['PENDING', 'CONFIRMED'] },
        startTime: { $lt: end },
        endTime: { $gt: start },
      })
        .session(session)
        .exec();

      if (conflict) {
        throw new ServiceError(
          'DOUBLE_BOOKING',
          'Resource is already reserved for this time slot.',
        );
      }

      const reservation = new Reservation({
        resourceId,
        userId,
        startTime: start,
        endTime: end,
        status: 'PENDING',
      });
      await reservation.save({ session });
      return toReservationResponse(reservation);
    },
    { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
  );
};

export const cancelReservation = async (id: string): Promise<ReservationResponse> => {
  // Setting the same status again is safe, including concurrent cancellation requests.
  const reservation = await Reservation.findByIdAndUpdate(
    id,
    { $set: { status: 'CANCELLED' } },
    { returnDocument: 'after', runValidators: true },
  ).exec();

  if (!reservation) {
    throw new ServiceError('RESERVATION_NOT_FOUND', 'Reservation not found.');
  }

  return toReservationResponse(reservation);
};
