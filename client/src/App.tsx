import { useState } from 'react';
import type { ChangeEvent, ReactElement, SubmitEvent } from 'react';
import type { Reservation, Resource } from '../../shared/api';
import { BookingForm } from './components/BookingForm';
import { ResourceList } from './components/ResourceList';
import { UserReservations } from './components/UserReservations';
import { useResources } from './hooks/useResources';
import { isStudentId } from './utils/bookingValidation';
import shared from './components/Reservation.module.css';
import styles from './App.module.css';

export const App = (): ReactElement => {
  const [resourceRefreshKey, setResourceRefreshKey] = useState<number>(0);
  const [bookingRefreshKey, setBookingRefreshKey] = useState<number>(0);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [studentDraft, setStudentDraft] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);
  const { resources, loading, error } = useResources(undefined, resourceRefreshKey);
  const selectedResource =
    resources.find((resource: Resource): boolean => resource.id === selectedResourceId) ?? null;

  const setStudent = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const value = studentDraft.trim();
    if (!isStudentId(value)) {
      setStudentError('Enter the 24-character ID of an existing student.');
      return;
    }
    setStudentError(null);
    setUserId(value.toLowerCase());
  };

  const handleBooked = (_reservation: Reservation): void => {
    setBookingRefreshKey((value: number): number => value + 1);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="CampusHub home">
          <span className={styles.mark} aria-hidden="true">
            C
          </span>
          CampusHub
        </a>
        <span className={styles.headerLabel}>Your campus, connected</span>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>Campus resources</p>
        <h1>Make room for your next idea.</h1>
        <p className={styles.intro}>
          Find spaces and tools for studying, creating, and working together.
        </p>
        <section className={shared.panel} aria-labelledby="student-title">
          <h2 id="student-title">Current student</h2>
          <p className={shared.hint}>
            Use your existing student ID to book resources and view your reservations.
          </p>
          <form className={styles.studentForm} onSubmit={setStudent} noValidate>
            <label htmlFor="student-id">Student ID</label>
            <input
              id="student-id"
              type="text"
              value={studentDraft}
              required
              spellCheck={false}
              autoComplete="off"
              aria-invalid={Boolean(studentError)}
              aria-describedby={studentError ? 'student-error' : undefined}
              onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                setStudentDraft(event.target.value);
                setStudentError(null);
              }}
            />
            <button type="submit">Set student</button>
          </form>
          {studentError && (
            <p id="student-error" className={shared.error} role="alert">
              {studentError}
            </p>
          )}
          {userId && (
            <p className={shared.hint} role="status">
              Current student: <code>{userId}</code>
            </p>
          )}
        </section>
        <div className={styles.workspace}>
          <ResourceList
            resources={resources}
            loading={loading}
            error={error}
            selectedResourceId={selectedResourceId}
            onRefresh={(): void => setResourceRefreshKey((value: number): number => value + 1)}
            onSelectResource={(resource: Resource): void => setSelectedResourceId(resource.id)}
          />
          <BookingForm resource={selectedResource} userId={userId} onBooked={handleBooked} />
        </div>
        <UserReservations userId={userId} resources={resources} refreshKey={bookingRefreshKey} />
      </main>
      <footer className={styles.footer}>CampusHub · Built for campus life</footer>
    </div>
  );
};
