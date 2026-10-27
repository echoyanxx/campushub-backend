import type { ReactElement } from 'react';
import type { Reservation, Resource } from '../api/types';
import { useUserReservations } from '../hooks/useUserReservations';
import styles from './Reservation.module.css';

interface UserReservationsProps {
  userId: string | null;
  resources: Resource[];
  refreshKey: number;
}

export const UserReservations = (props: UserReservationsProps): ReactElement => (
  <ReservationList key={props.userId ?? 'guest'} {...props} />
);

const ReservationList = ({
  userId,
  resources,
  refreshKey,
}: UserReservationsProps): ReactElement => {
  const { reservations, loading, loadError, actionError, success, cancellingId, refresh, cancel } =
    useUserReservations(userId, refreshKey);
  const resourceName = (resourceId: string): string =>
    resources.find((resource: Resource): boolean => resource.id === resourceId)?.name ??
    `Resource ${resourceId}`;
  return (
    <section className={styles.panel} aria-labelledby="my-bookings-title">
      <div className={styles.heading}>
        <h2 id="my-bookings-title">My Bookings</h2>
        <button
          type="button"
          disabled={!userId || loading || cancellingId !== null}
          onClick={refresh}
        >
          Refresh bookings
        </button>
      </div>
      <p className={styles.hint}>Pending and confirmed reservations for the current student.</p>
      {!userId && <p>Set your student ID above to see your bookings.</p>}
      {loadError && (
        <p className={styles.error} role="alert">
          {loadError} Use Refresh bookings to try again.
        </p>
      )}
      {actionError && (
        <p className={styles.error} role="alert">
          {actionError} Refresh bookings to confirm its current status before retrying.
        </p>
      )}
      {success && (
        <p className={styles.success} role="status">
          {success}
        </p>
      )}
      <div aria-busy={loading}>
        {loading && <p role="status">Loading your bookings…</p>}
        {userId && !loading && !loadError && reservations.length === 0 && (
          <p role="status">No active bookings. Choose a resource to make your first reservation.</p>
        )}
        {userId && reservations.length > 0 && (
          <ul className={styles.bookings}>
            {reservations.map((reservation: Reservation): ReactElement => (
              <li className={styles.booking} key={reservation.id}>
                <div>
                  <h3>{resourceName(reservation.resourceId)}</h3>
                  <span className={styles.badge}>
                    {reservation.status === 'PENDING' ? 'Pending' : 'Confirmed'}
                  </span>
                </div>
                <p>
                  <time dateTime={reservation.startTime}>
                    {new Date(reservation.startTime).toLocaleString()}
                  </time>
                  <br />
                  to{' '}
                  <time dateTime={reservation.endTime}>
                    {new Date(reservation.endTime).toLocaleString()}
                  </time>
                </p>
                <button
                  type="button"
                  disabled={loading || cancellingId !== null}
                  aria-label={`Cancel reservation for ${resourceName(reservation.resourceId)} starting ${new Date(reservation.startTime).toLocaleString()}`}
                  onClick={(): void => {
                    void cancel(reservation.id);
                  }}
                >
                  {cancellingId === reservation.id ? 'Cancelling…' : 'Cancel Reservation'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
