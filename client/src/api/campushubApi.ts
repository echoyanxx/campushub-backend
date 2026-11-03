import type {
  CreateReservationRequest,
  ErrorResponse,
  Reservation,
  Resource,
} from '../../../shared/api';

const baseUrl = (import.meta.env?.VITE_API_BASE_URL?.trim() || '/api/v1').replace(/\/+$/, '');
const identifierPattern = /^[a-fA-F0-9]{24}$/;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isIdentifier = (value: unknown): value is string =>
  typeof value === 'string' && identifierPattern.test(value);

const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));

const isResource = (value: unknown): value is Resource =>
  isObject(value) &&
  isIdentifier(value.id) &&
  typeof value.name === 'string' &&
  (value.type === 'ROOM' || value.type === 'EQUIPMENT' || value.type === 'LAB') &&
  typeof value.isAvailable === 'boolean' &&
  typeof value.location === 'string';

const isReservation = (value: unknown): value is Reservation =>
  isObject(value) &&
  isIdentifier(value.id) &&
  isIdentifier(value.resourceId) &&
  isIdentifier(value.userId) &&
  isTimestamp(value.startTime) &&
  isTimestamp(value.endTime) &&
  (value.status === 'PENDING' || value.status === 'CONFIRMED' || value.status === 'CANCELLED');

const isErrorResponse = (value: unknown): value is ErrorResponse =>
  isObject(value) && typeof value.code === 'string' && typeof value.message === 'string';

const request = async <T>(
  path: string,
  validate: (value: unknown) => value is T,
  options: RequestInit = {},
): Promise<T> => {
  const controller = new AbortController();
  const abortRequest = (): void => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', abortRequest, { once: true });
  if (options.signal?.aborted) abortRequest();
  const timeout = setTimeout((): void => controller.abort(), 15_000);

  try {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { Accept: 'application/json', ...options.headers },
      });
    } catch (error: unknown) {
      if (controller.signal.aborted) throw error;
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        'Unable to reach CampusHub. Check your connection and try again.',
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError(
        response.status,
        'INVALID_RESPONSE',
        'CampusHub returned an unreadable response. Please try again.',
      );
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        isErrorResponse(body) ? body.code : 'HTTP_ERROR',
        isErrorResponse(body) ? body.message : `CampusHub request failed (${response.status}).`,
      );
    }
    if (!validate(body)) {
      throw new ApiError(
        response.status,
        'INVALID_RESPONSE',
        'CampusHub returned data that does not match the API contract.',
      );
    }
    return body;
  } catch (error: unknown) {
    if (options.signal?.aborted) {
      throw options.signal.reason ?? new DOMException('Request aborted.', 'AbortError');
    }
    if (controller.signal.aborted) {
      throw new ApiError(
        0,
        'REQUEST_TIMEOUT',
        'CampusHub took too long to respond. Refresh to check the latest state before trying again.',
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortRequest);
  }
};

const validateIdentifier = (value: string, label: string): void => {
  if (!isIdentifier(value)) {
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      `${label} must be a 24-character MongoDB identifier.`,
    );
  }
};

export const fetchResources = async (type?: string, signal?: AbortSignal): Promise<Resource[]> => {
  if (type !== undefined && !['ROOM', 'EQUIPMENT', 'LAB'].includes(type)) {
    throw new ApiError(400, 'INVALID_REQUEST', 'Resource type must be ROOM, EQUIPMENT, or LAB.');
  }
  const query = type === undefined ? '' : `?${new URLSearchParams({ type }).toString()}`;
  return request(
    `/resources${query}`,
    (value: unknown): value is Resource[] => Array.isArray(value) && value.every(isResource),
    { signal },
  );
};

export const createReservation = async (
  payload: CreateReservationRequest,
): Promise<Reservation> => {
  validateIdentifier(payload.resourceId, 'Resource ID');
  validateIdentifier(payload.userId, 'User ID');
  if (!isTimestamp(payload.startTime) || !isTimestamp(payload.endTime)) {
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'Reservation times must be ISO timestamps with a timezone.',
    );
  }
  if (Date.parse(payload.startTime) >= Date.parse(payload.endTime)) {
    throw new ApiError(400, 'INVALID_TIME_RANGE', 'Start time must be before end time.');
  }
  return request('/reservations', isReservation, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const fetchUserReservations = async (
  userId: string,
  signal?: AbortSignal,
): Promise<Reservation[]> => {
  validateIdentifier(userId, 'User ID');
  return request(
    `/reservations/user/${encodeURIComponent(userId)}`,
    (value: unknown): value is Reservation[] => Array.isArray(value) && value.every(isReservation),
    { signal },
  );
};

export const cancelReservation = async (reservationId: string): Promise<Reservation> => {
  validateIdentifier(reservationId, 'Reservation ID');
  return request(`/reservations/${encodeURIComponent(reservationId)}/cancel`, isReservation, {
    method: 'PATCH',
  });
};
