import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type ReservationStatusValue = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface IReservation extends Document {
  resourceId: Types.ObjectId;
  userId: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  status: ReservationStatusValue;
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
    },
  },
  {
    timestamps: true,
  }
);

const Reservation: Model<IReservation> = mongoose.model<IReservation>('Reservation', reservationSchema);

export default Reservation;
