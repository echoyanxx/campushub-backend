import mongoose, { Document, Model, Schema } from 'mongoose';
import type { ResourceType } from '../../shared/api';

export interface IResource extends Document {
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
  reservationVersion: number;
}

const resourceSchema = new Schema<IResource>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['ROOM', 'EQUIPMENT', 'LAB'],
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      required: true,
      default: true,
    },
    reservationVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

export const Resource: Model<IResource> = mongoose.model<IResource>('Resource', resourceSchema);

export default Resource;
