import mongoose, { Document, Model, Schema } from 'mongoose';

export type ResourceTypeValue = 'ROOM' | 'EQUIPMENT' | 'LAB';

export interface IResource extends Document {
  name: string;
  type: ResourceTypeValue;
  location: string;
  isAvailable: boolean;
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
  },
  {
    timestamps: true,
  }
);

export const Resource: Model<IResource> = mongoose.model<IResource>('Resource', resourceSchema);

export default Resource;
