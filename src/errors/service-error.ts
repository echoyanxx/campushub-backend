export type ServiceErrorCode =
  | 'INVALID_TIME_RANGE'
  | 'RESOURCE_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'RESERVATION_NOT_FOUND'
  | 'DOUBLE_BOOKING';

export class ServiceError extends Error {
  public constructor(
    public readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
