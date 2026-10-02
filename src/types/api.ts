export enum ResourceType {
  ROOM = 'ROOM',
  EQUIPMENT = 'EQUIPMENT',
  LAB = 'LAB',
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Resource {
  id: string;
  name: string;
  resourceType: ResourceType;
  location: string;
  available: boolean;
}

export interface Reservation {
  id: string;
  userId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
}

export interface CreateReservationRequest {
  userId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
