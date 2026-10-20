import { HydratedDocument } from 'mongoose';
import Resource, { IResource } from '../models/Resource.model';
import { Resource as ResourceResponse, ResourceQuery } from '../types/reservation';

export const listResources = async (filters: ResourceQuery): Promise<ResourceResponse[]> => {
  const resources = await Resource.find(filters).sort({ name: 1 }).exec();

  return resources.map((resource: HydratedDocument<IResource>): ResourceResponse => ({
    id: resource._id.toString(),
    name: resource.name,
    type: resource.type,
    isAvailable: resource.isAvailable,
    location: resource.location,
  }));
};
