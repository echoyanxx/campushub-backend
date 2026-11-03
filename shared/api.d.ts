// Wire contract: docs/openapi.yaml. Type declarations only; no runtime dependencies.
export type ResourceType = 'ROOM' | 'EQUIPMENT' | 'LAB';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  isAvailable: boolean;
  location: string;
}

export interface CreateReservationRequest {
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
}

export interface Reservation extends CreateReservationRequest {
  id: string;
  status: ReservationStatus;
}

export interface ErrorResponse {
  code: string;
  message: string;
}

export interface ResourceQuery {
  type?: ResourceType;
  isAvailable?: boolean;
}
