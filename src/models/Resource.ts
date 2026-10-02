import mongoose, { Document, Model, Schema } from 'mongoose';

export type ResourceTypeValue = 'ROOM' | 'EQUIPMENT' | 'LAB';

export interface IResource extends Document {
  name: string;
  resourceType: ResourceTypeValue;
  location: string;
  available: boolean;
}

const resourceSchema = new Schema<IResource>(
  {
    name: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      enum: ['ROOM', 'EQUIPMENT', 'LAB'],
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    available: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Resource: Model<IResource> = mongoose.model<IResource>('Resource', resourceSchema);

export default Resource;
