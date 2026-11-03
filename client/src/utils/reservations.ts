import type { Reservation } from '../../../shared/api';

export const activeReservationsForUser = (
  reservations: Reservation[],
  userId: string,
): Reservation[] =>
  reservations
    .filter(
      (reservation: Reservation): boolean =>
        reservation.userId === userId &&
        (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED'),
    )
    .sort(
      (left: Reservation, right: Reservation): number =>
        Date.parse(left.startTime) - Date.parse(right.startTime) || left.id.localeCompare(right.id),
    );
