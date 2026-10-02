import { Request, Response, Router } from 'express';
import {
  CreateReservationRequest,
  ErrorResponse,
  Reservation,
  ReservationStatus,
  Resource,
  ResourceType,
} from '../types/reservation';

const router = Router();

const RESOURCE_TYPES: ResourceType[] = ['ROOM', 'EQUIPMENT', 'LAB'];

const resources: Resource[] = [
  { id: 'res-101', name: 'Conference Room A', type: 'ROOM', isAvailable: true },
  { id: 'res-102', name: 'Projector Kit', type: 'EQUIPMENT', isAvailable: true },
  { id: 'res-103', name: 'Chemistry Lab', type: 'LAB', isAvailable: true },
];

const reservations: Reservation[] = [];

const sendError = (res: Response, statusCode: number, code: string, message: string): void => {
  const payload: ErrorResponse = { code, message };
  res.status(statusCode).json(payload);
};

const isValidIsoDateTime = (value: string): boolean => {
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
  return isoPattern.test(value) && !Number.isNaN(Date.parse(value));
};

const hasRequiredReservationFields = (body: Partial<CreateReservationRequest>): body is CreateReservationRequest => {
  return (
    typeof body.resourceId === 'string' &&
    body.resourceId.trim().length > 0 &&
    typeof body.userId === 'string' &&
    body.userId.trim().length > 0 &&
    typeof body.startTime === 'string' &&
    body.startTime.trim().length > 0 &&
    typeof body.endTime === 'string' &&
    body.endTime.trim().length > 0
  );
};

router.get('/resources', (req: Request, res: Response): void => {
  const { type } = req.query as { type?: string };

  if (type !== undefined) {
    const normalizedType = typeof type === 'string' ? type.trim() : '';

    if (normalizedType.length === 0 || !RESOURCE_TYPES.includes(normalizedType as ResourceType)) {
      sendError(res, 400, 'INVALID_RESOURCE_TYPE', 'Resource type must be one of ROOM, EQUIPMENT, LAB.');
      return;
    }

    const filteredResources = resources.filter((resource) => resource.type === normalizedType);
    res.status(200).json(filteredResources);
    return;
  }

  res.status(200).json(resources);
});

router.post('/reservations', (req: Request, res: Response): void => {
  try {
    const body = req.body as Partial<CreateReservationRequest>;

    if (!hasRequiredReservationFields(body)) {
      sendError(res, 400, 'INVALID_REQUEST', 'resourceId, userId, startTime, and endTime are required.');
      return;
    }

    const { resourceId, userId, startTime, endTime } = body;

    if (!isValidIsoDateTime(startTime) || !isValidIsoDateTime(endTime)) {
      sendError(res, 400, 'INVALID_DATE_TIME', 'startTime and endTime must be valid ISO 8601 date-time strings.');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      sendError(res, 400, 'INVALID_TIME_RANGE', 'startTime must be before endTime.');
      return;
    }

    const resourceExists = resources.some((resource) => resource.id === resourceId);
    if (!resourceExists) {
      sendError(res, 404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
      return;
    }

    const hasConflict = reservations.some((reservation) => {
      if (reservation.resourceId !== resourceId || reservation.status === 'CANCELLED') {
        return false;
      }

      const existingStart = new Date(reservation.startTime);
      const existingEnd = new Date(reservation.endTime);

      return existingStart < end && existingEnd > start;
    });

    if (hasConflict) {
      sendError(
        res,
        409,
        'DOUBLE_BOOKING',
        'Resource is already reserved for this time slot.'
      );
      return;
    }

    const nextReservation: Reservation = {
      id: `res-${Date.now()}`,
      resourceId,
      userId,
      startTime,
      endTime,
      status: 'PENDING' as ReservationStatus,
    };

    reservations.push(nextReservation);
    res.status(201).json(nextReservation);
  } catch (error) {
    sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error.');
  }
});

router.get('/reservations/user/:userId', (req: Request, res: Response): void => {
  const { userId } = req.params;

  const activeReservations = reservations.filter(
    (reservation) => reservation.userId === userId && reservation.status !== 'CANCELLED'
  );

  res.status(200).json(activeReservations);
});

export default router;
