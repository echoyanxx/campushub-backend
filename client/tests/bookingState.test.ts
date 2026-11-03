import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Reservation, Resource } from '../../shared/api';
import { validateBooking, isStudentId } from '../src/utils/bookingValidation.ts';
import { activeReservationsForUser } from '../src/utils/reservations.ts';

const userId = '507f1f77bcf86cd799439011';
const resource: Resource = {
  id: '507f1f77bcf86cd799439012',
  name: 'Study room',
  type: 'ROOM',
  isAvailable: true,
  location: 'Library',
};
const values = { startTime: '2026-11-02T10:00', endTime: '2026-11-02T11:00' };

test('converts local form times to timezone-aware API timestamps', (): void => {
  const result = validateBooking(values, resource, userId);
  assert.equal(result.valid, true);
  if (!result.valid) assert.fail('Expected valid booking');
  assert.deepEqual(result.payload, {
    resourceId: resource.id,
    userId,
    startTime: new Date(2026, 10, 2, 10, 0).toISOString(),
    endTime: new Date(2026, 10, 2, 11, 0).toISOString(),
  });
});

test('requires a selected resource, student, and both times', (): void => {
  const result = validateBooking({ startTime: '', endTime: '' }, null, null);
  assert.equal(result.valid, false);
  if (result.valid) assert.fail('Expected validation errors');
  assert.ok(result.errors.resource);
  assert.ok(result.errors.userId);
  assert.ok(result.errors.startTime);
  assert.ok(result.errors.endTime);
});

test('rejects unavailable resources and invalid student identifiers', (): void => {
  const result = validateBooking(values, { ...resource, isAvailable: false }, 'student');
  assert.equal(result.valid, false);
  if (result.valid) assert.fail('Expected validation errors');
  assert.ok(result.errors.resource);
  assert.ok(result.errors.userId);
  assert.equal(isStudentId('123'), false);
  assert.equal(isStudentId(userId), true);
});

test('rejects equal or reversed times with a field-specific error', (): void => {
  for (const endTime of [values.startTime, '2026-11-02T09:00']) {
    const result = validateBooking({ ...values, endTime }, resource, userId);
    assert.equal(result.valid, false);
    if (result.valid) assert.fail('Expected validation errors');
    assert.equal(result.errors.endTime, 'End time must be after start time.');
  }
});

test('rejects impossible calendar dates rather than silently rolling them over', (): void => {
  const result = validateBooking(
    { startTime: '2026-02-30T10:00', endTime: '2026-03-03T10:00' },
    resource,
    userId,
  );
  assert.equal(result.valid, false);
  if (result.valid) assert.fail('Expected validation errors');
  assert.ok(result.errors.startTime);
});

test('dashboard includes only this student’s pending and confirmed bookings in time order', (): void => {
  const later: Reservation = {
    id: '507f1f77bcf86cd799439021',
    resourceId: resource.id,
    userId,
    startTime: '2026-11-02T11:00:00Z',
    endTime: '2026-11-02T12:00:00Z',
    status: 'CONFIRMED',
  };
  const earlier: Reservation = {
    ...later,
    id: '507f1f77bcf86cd799439022',
    status: 'PENDING',
    startTime: '2026-11-02T10:00:00Z',
  };
  const cancelled: Reservation = { ...later, id: '507f1f77bcf86cd799439023', status: 'CANCELLED' };
  const anotherStudent: Reservation = { ...earlier, userId: '507f1f77bcf86cd799439024' };
  const input = [later, cancelled, anotherStudent, earlier];
  assert.deepEqual(activeReservationsForUser(input, userId), [earlier, later]);
  assert.deepEqual(input, [later, cancelled, anotherStudent, earlier]);
  assert.deepEqual(activeReservationsForUser([{ ...earlier, status: 'CANCELLED' }], userId), []);
});
