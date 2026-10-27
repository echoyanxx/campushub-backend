// Contract source: docs/openapi.yaml (API v1.1.0).
export type ResourceType = 'ROOM' | 'EQUIPMENT' | 'LAB';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  isAvailable: boolean;
  location: string;
}

export interface CreateReservationDTO {
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
}

export interface Reservation extends CreateReservationDTO {
  id: string;
  status: ReservationStatus;
}

export interface ErrorResponse {
  code: string;
  message: string;
}
