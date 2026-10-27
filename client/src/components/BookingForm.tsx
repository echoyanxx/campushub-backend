import type { ChangeEvent, ReactElement, SubmitEvent } from 'react';
import type { Reservation, Resource } from '../api/types';
import { useBooking } from '../hooks/useBooking';
import styles from './Reservation.module.css';

interface BookingFormProps {
  resource: Resource | null;
  userId: string | null;
  onBooked: (reservation: Reservation) => void;
}

// Reset mutation state whenever the student or selected resource changes.
export const BookingForm = (props: BookingFormProps): ReactElement => (
  <BookingFields key={`${props.userId ?? 'guest'}:${props.resource?.id ?? 'none'}`} {...props} />
);

const BookingFields = ({ resource, userId, onBooked }: BookingFormProps): ReactElement => {
  const { values, errors, error, success, submitting, setField, submit } = useBooking({
    resource,
    userId,
    onBooked,
  });
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void submit();
  };
  return (
    <section className={styles.panel} aria-labelledby="booking-title">
      <h2 id="booking-title">Book a resource</h2>
      <p>
        {resource
          ? `${resource.name} · ${resource.location}`
          : 'Choose a resource from the directory to get started.'}
      </p>
      {!userId && <p className={styles.hint}>Set your student ID above before booking.</p>}
      <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <fieldset
          disabled={submitting || !resource || !userId || !resource.isAvailable}
          className={styles.fields}
        >
          <legend className={styles.legend}>Reservation times</legend>
          <label htmlFor="booking-start">Start time</label>
          <input
            id="booking-start"
            type="datetime-local"
            required
            value={values.startTime}
            aria-invalid={Boolean(errors.startTime)}
            aria-describedby={
              errors.startTime ? 'booking-start-error booking-timezone' : 'booking-timezone'
            }
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              setField('startTime', event.target.value)
            }
          />
          {errors.startTime && (
            <p id="booking-start-error" className={styles.fieldError}>
              {errors.startTime}
            </p>
          )}
          <label htmlFor="booking-end">End time</label>
          <input
            id="booking-end"
            type="datetime-local"
            required
            min={values.startTime || undefined}
            value={values.endTime}
            aria-invalid={Boolean(errors.endTime)}
            aria-describedby={
              errors.endTime ? 'booking-end-error booking-timezone' : 'booking-timezone'
            }
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              setField('endTime', event.target.value)
            }
          />
          {errors.endTime && (
            <p id="booking-end-error" className={styles.fieldError}>
              {errors.endTime}
            </p>
          )}
          <p id="booking-timezone" className={styles.hint}>
            Times use your device’s local timezone.
          </p>
          <button type="submit" className={styles.primary}>
            {submitting ? 'Submitting booking…' : 'Request booking'}
          </button>
        </fieldset>
        {(errors.resource || errors.userId || errors.startTime || errors.endTime) && (
          <p className={styles.error} role="alert">
            {errors.resource || errors.userId || 'Check the reservation times below their fields.'}
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className={styles.success} role="status">
            {success}
          </p>
        )}
      </form>
    </section>
  );
};
