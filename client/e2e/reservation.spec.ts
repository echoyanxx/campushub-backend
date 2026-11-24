import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page, Response, TestInfo } from '@playwright/test';
import fixtures from './fixtures/reservation.json' with { type: 'json' };

interface BookingSlot {
  startTime: string;
  endTime: string;
}

const browserLocale = 'en-US';
const browserTimezone = 'UTC';
const firstWorkerDay = Date.UTC(2030, 0, 1, 12);
const reservationsPath = '/api/v1/reservations';
const noBookingsMessage = 'No active bookings. Choose a resource to make your first reservation.';

test.use({ locale: browserLocale, timezoneId: browserTimezone });

async function tomorrowSlot(
  page: Page,
  workerIndex: number,
  startHour: number,
): Promise<BookingSlot> {
  // The browser projects share a catalog. Give each worker, including retries, its own calendar day.
  const today = new Date(firstWorkerDay);
  today.setUTCDate(today.getUTCDate() + workerIndex);
  await page.clock.setFixedTime(today);

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(startHour);
  const end = new Date(start);
  end.setUTCHours(startHour + 1);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

function bookingTimeLabel(time: string): string {
  return new Date(time).toLocaleString(browserLocale, { timeZone: browserTimezone });
}

async function setStudent(page: Page, studentId: string): Promise<void> {
  await page.goto('/');
  const student = page.getByRole('region', { name: 'Current student' });
  await student.getByLabel('Student ID', { exact: true }).fill(studentId);
  await student.getByRole('button', { name: 'Set student', exact: true }).click();
  await expect(student.getByRole('status')).toContainText(studentId);
}

async function requestBooking(
  page: Page,
  category: string,
  resourceName: string,
  slot: BookingSlot,
): Promise<Response> {
  const directory = page.getByRole('region', { name: 'Explore resources' });
  await directory.getByRole('button', { name: category, exact: true }).click();
  await directory.getByRole('button', { name: `Book ${resourceName}`, exact: true }).click();

  const form = page.getByRole('region', { name: 'Book a resource' });
  await form.getByLabel('Start time', { exact: true }).fill(slot.startTime.slice(0, 16));
  await form.getByLabel('End time', { exact: true }).fill(slot.endTime.slice(0, 16));
  const [response] = await Promise.all([
    page.waitForResponse(
      (response: Response): boolean =>
        new URL(response.url()).pathname === reservationsPath &&
        response.request().method() === 'POST',
    ),
    form.getByRole('button', { name: 'Request booking', exact: true }).click(),
  ]);
  return response;
}

test('Student successfully requests an available study room', async ({ page }: { page: Page }, {
  workerIndex,
}: TestInfo): Promise<void> => {
  const room = fixtures.studyRoom;
  const slot = await tomorrowSlot(page, workerIndex, 10);

  await test.step('Given the student has set their ID', async (): Promise<void> => {
    await setStudent(page, fixtures.students.roomRequester);
  });

  await test.step('When they filter by Study rooms and request the room from 10 to 11 AM', async (): Promise<void> => {
    const response = await requestBooking(page, 'Study rooms', room.name, slot);
    expect(response.status()).toBe(201);
  });

  await test.step('Then they see the success message and a pending booking for the requested time', async (): Promise<void> => {
    const form = page.getByRole('region', { name: 'Book a resource' });
    await expect(form.getByRole('status')).toHaveText(
      'Booking requested. Your reservation is pending confirmation.',
    );

    const bookings = page.getByRole('region', { name: 'My Bookings' });
    const booking = bookings
      .getByRole('listitem')
      .filter({
        has: page.getByRole('heading', { name: room.name, exact: true }),
      })
      .filter({
        has: page.getByText(bookingTimeLabel(slot.startTime), { exact: true }),
      });
    await expect(booking.getByText('Pending', { exact: true })).toBeVisible();
    await expect(booking.getByText(bookingTimeLabel(slot.endTime), { exact: true })).toBeVisible();
  });
});

test('Student receives a conflict alert when a resource is already reserved', async ({
  page,
  request,
}: { page: Page; request: APIRequestContext }, { workerIndex }: TestInfo): Promise<void> => {
  const printer = fixtures.printer;
  const { printerOwner, printerRequester } = fixtures.students;
  const slot = await tomorrowSlot(page, workerIndex, 14);
  const bookings = page.getByRole('region', { name: 'My Bookings' });
  const studentReservations = `${reservationsPath}/user/${printerRequester}`;

  await test.step('Given the printer is already reserved from 2 to 3 PM and a different student has no bookings', async (): Promise<void> => {
    const existing = await request.post(reservationsPath, {
      data: { ...slot, resourceId: printer.id, userId: printerOwner },
    });
    await expect(existing).toBeOK();

    await setStudent(page, printerRequester);
    await expect(bookings.getByText(noBookingsMessage, { exact: true })).toBeVisible();
  });

  await test.step('When the student filters by Equipment and requests the same slot', async (): Promise<void> => {
    const response = await requestBooking(page, 'Equipment', printer.name, slot);
    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'DOUBLE_BOOKING' });
  });

  await test.step('Then the conflict alert appears and refreshing shows no reservation was created', async (): Promise<void> => {
    const form = page.getByRole('region', { name: 'Book a resource' });
    await expect(form.getByRole('alert')).toHaveText(
      'This resource is already booked for that time. Choose a different time and try again.',
    );

    const [refreshed] = await Promise.all([
      page.waitForResponse(
        (response: Response): boolean =>
          new URL(response.url()).pathname === studentReservations &&
          response.request().method() === 'GET',
      ),
      bookings.getByRole('button', { name: 'Refresh bookings', exact: true }).click(),
    ]);
    expect([200, 304]).toContain(refreshed.status());
    await expect(bookings.getByText(noBookingsMessage, { exact: true })).toBeVisible();

    const storedReservations = await request.get(studentReservations);
    await expect(storedReservations).toBeOK();
    expect(await storedReservations.json()).toEqual([]);
  });
});
