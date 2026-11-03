import { useEffect, useRef, useState } from 'react';
import { ApiError, createReservation } from '../api/campushubApi';
import type { Reservation, Resource } from '../../../shared/api';
import { validateBooking } from '../utils/bookingValidation';
import type { BookingErrors, BookingValues } from '../utils/bookingValidation';
import { getErrorMessage } from '../utils/errorMessage.ts';

interface UseBookingOptions {
  resource: Resource | null;
  userId: string | null;
  onBooked: (reservation: Reservation) => void;
}

interface BookingState {
  values: BookingValues;
  errors: BookingErrors;
  error: string | null;
  success: string | null;
  submitting: boolean;
  setField: (field: keyof BookingValues, value: string) => void;
  submit: () => Promise<void>;
}

export const useBooking = ({ resource, userId, onBooked }: UseBookingOptions): BookingState => {
  const [values, setValues] = useState<BookingValues>({ startTime: '', endTime: '' });
  const [errors, setErrors] = useState<BookingErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const pending = useRef<boolean>(false);
  const mounted = useRef<boolean>(false);

  useEffect((): (() => void) => {
    mounted.current = true;
    return (): void => {
      mounted.current = false;
    };
  }, []);

  const setField = (field: keyof BookingValues, value: string): void => {
    setValues((previous: BookingValues): BookingValues => ({ ...previous, [field]: value }));
    setErrors({});
    setError(null);
    setSuccess(null);
  };

  const submit = async (): Promise<void> => {
    if (pending.current) return;
    setError(null);
    setSuccess(null);
    const result = validateBooking(values, resource, userId);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    pending.current = true;
    setSubmitting(true);
    try {
      const reservation = await createReservation(result.payload);
      // Refresh the dashboard even if the student selected another resource meanwhile.
      onBooked(reservation);
      if (!mounted.current) return;
      setSuccess('Booking requested. Your reservation is pending confirmation.');
      setValues({ startTime: '', endTime: '' });
    } catch (failure: unknown) {
      if (!mounted.current) return;
      setError(
        failure instanceof ApiError && failure.status === 409
          ? 'This resource is already booked for that time. Choose a different time and try again.'
          : getErrorMessage(failure, 'Unable to create the booking. Please try again.'),
      );
    } finally {
      pending.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  return { values, errors, error, success, submitting, setField, submit };
};
