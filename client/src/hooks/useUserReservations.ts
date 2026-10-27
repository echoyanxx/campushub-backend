import { useEffect, useRef, useState } from 'react';
import { cancelReservation, fetchUserReservations } from '../api/campushubApi';
import type { Reservation } from '../api/types';
import { activeReservationsForUser } from '../utils/reservations';

interface ReservationState {
  reservations: Reservation[];
  loading: boolean;
  loadError: string | null;
  actionError: string | null;
  success: string | null;
  cancellingId: string | null;
  refresh: () => void;
  cancel: (reservationId: string) => Promise<void>;
}

export const useUserReservations = (
  userId: string | null,
  refreshKey: number,
): ReservationState => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [revision, setRevision] = useState<number>(0);
  const pending = useRef<boolean>(false);
  const mounted = useRef<boolean>(false);

  useEffect((): (() => void) => {
    mounted.current = true;
    return (): void => {
      mounted.current = false;
    };
  }, []);

  useEffect((): (() => void) => {
    const controller = new AbortController();
    const load = async (): Promise<void> => {
      if (!userId) return;
      setLoading(true);
      setLoadError(null);
      try {
        const result = await fetchUserReservations(userId, controller.signal);
        if (!controller.signal.aborted) setReservations(activeReservationsForUser(result, userId));
      } catch (failure: unknown) {
        if (!controller.signal.aborted)
          setLoadError(
            failure instanceof Error ? failure.message : 'Unable to load your bookings.',
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return (): void => controller.abort();
  }, [userId, refreshKey, revision]);

  const refresh = (): void => setRevision((value: number): number => value + 1);

  const cancel = async (reservationId: string): Promise<void> => {
    if (pending.current || loading || !userId) return;
    if (!reservations.some((reservation: Reservation): boolean => reservation.id === reservationId))
      return;
    pending.current = true;
    setCancellingId(reservationId);
    setActionError(null);
    setSuccess(null);
    try {
      const cancelled = await cancelReservation(reservationId);
      if (!mounted.current) return;
      setReservations((previous: Reservation[]): Reservation[] =>
        activeReservationsForUser(
          previous.map((reservation: Reservation): Reservation =>
            reservation.id === cancelled.id ? cancelled : reservation,
          ),
          userId,
        ),
      );
      setSuccess('Reservation cancelled. The time slot is now free.');
      refresh();
    } catch (failure: unknown) {
      if (mounted.current)
        setActionError(
          failure instanceof Error
            ? failure.message
            : 'Unable to cancel the reservation. Please try again.',
        );
    } finally {
      pending.current = false;
      if (mounted.current) setCancellingId(null);
    }
  };

  return { reservations, loading, loadError, actionError, success, cancellingId, refresh, cancel };
};
