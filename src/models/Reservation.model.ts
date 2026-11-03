import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import type { ReservationStatus } from '../../shared/api';

export interface IReservation extends Document {
  resourceId: Types.ObjectId;
  userId: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
}

const reservationSchema = new Schema<IReservation>(
  {
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
      required: true,
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  },
);

reservationSchema.index({ resourceId: 1, status: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ userId: 1, startTime: 1 });

export const Reservation: Model<IReservation> = mongoose.model<IReservation>(
  'Reservation',
  reservationSchema,
);

export default Reservation;
