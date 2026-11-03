import type { CreateReservationRequest, Resource } from '../../../shared/api';

export interface BookingValues {
  startTime: string;
  endTime: string;
}

export interface BookingErrors {
  resource?: string;
  userId?: string;
  startTime?: string;
  endTime?: string;
}

export type BookingValidationResult =
  { valid: true; payload: CreateReservationRequest } | { valid: false; errors: BookingErrors };

export const isStudentId = (value: string): boolean => /^[a-fA-F0-9]{24}$/.test(value);

const parseLocalTime = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  // Reject calendar rollover and local times skipped by a daylight-saving change.
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  )
    return null;
  return date;
};

export const validateBooking = (
  values: BookingValues,
  resource: Resource | null,
  userId: string | null,
): BookingValidationResult => {
  const errors: BookingErrors = {};
  if (!resource) errors.resource = 'Choose a resource from the directory.';
  else if (!resource.isAvailable) errors.resource = 'This resource is currently unavailable.';
  if (!userId || !isStudentId(userId)) errors.userId = 'Set a valid student ID before booking.';
  const start = parseLocalTime(values.startTime);
  const end = parseLocalTime(values.endTime);
  if (!start) errors.startTime = 'Enter a valid start date and time.';
  if (!end) errors.endTime = 'Enter a valid end date and time.';
  if (start && end && start >= end) errors.endTime = 'End time must be after start time.';
  if (Object.keys(errors).length > 0 || !resource || !userId || !start || !end) {
    return { valid: false, errors };
  }
  return {
    valid: true,
    payload: {
      resourceId: resource.id,
      userId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  };
};
