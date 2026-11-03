import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ServiceError, ServiceErrorCode } from '../errors/service-error';
import type { ErrorResponse } from '../../shared/api';

const serviceErrorStatuses: Record<ServiceErrorCode, number> = {
  INVALID_TIME_RANGE: 400,
  RESOURCE_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  RESERVATION_NOT_FOUND: 404,
  DOUBLE_BOOKING: 409,
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ServiceError) {
    res.status(serviceErrorStatuses[error.code]).json({ code: error.code, message: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      code: 'INVALID_REQUEST',
      message: error.issues[0]?.message ?? 'Invalid request.',
    });
    return;
  }

  if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
    res.status(400).json({ code: 'INVALID_JSON', message: 'Request body must be valid JSON.' });
    return;
  }

  res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' });
};
