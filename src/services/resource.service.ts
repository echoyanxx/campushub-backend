import Resource, { ResourceTypeValue } from '../models/Resource.model';

export type ResourceType = ResourceTypeValue;

export interface ResourceListItem {
  id: string;
  name: string;
  type: ResourceType;
  isAvailable: boolean;
  location: string;
}

interface ResourceDocumentShape {
  _id: { toString: () => string };
  name: string;
  type: ResourceType;
  isAvailable: boolean;
  location: string;
}

export const listResources = async (type?: string): Promise<ResourceListItem[]> => {
  const normalizedType = typeof type === 'string' ? type.trim() : '';
  const validTypes: ResourceType[] = ['ROOM', 'EQUIPMENT', 'LAB'];

  if (normalizedType.length > 0 && !validTypes.includes(normalizedType as ResourceType)) {
    const error = new Error('Resource type must be one of ROOM, EQUIPMENT, LAB.');
    (error as Error & { status?: number; payload?: { error?: string; message: string } }).status = 400;
    (error as Error & { status?: number; payload?: { error?: string; message: string } }).payload = {
      error: 'INVALID_RESOURCE_TYPE',
      message: 'Resource type must be one of ROOM, EQUIPMENT, LAB.',
    };
    throw error;
  }

  const query: { type?: ResourceType } = normalizedType.length > 0 ? { type: normalizedType as ResourceType } : {};
  const resources = await Resource.find(query).sort({ name: 1 }).lean<ResourceDocumentShape[]>();

  return resources.map((resource) => ({
    id: resource._id.toString(),
    name: resource.name,
    type: resource.type,
    isAvailable: resource.isAvailable,
    location: resource.location,
  }));
};
