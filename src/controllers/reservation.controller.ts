import { Request, Response } from 'express';
import {
  createReservation as createReservationService,
  getReservationsByUser as getReservationsByUserService,
} from '../services/reservation.service';

const handleServiceError = (res: Response, error: unknown): void => {
  if (error && typeof error === 'object' && 'status' in error && 'payload' in error) {
    const apiError = error as { status: number; payload: { error?: string; message: string } };
    res.status(apiError.status).json(apiError.payload);
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
};

export const createReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const reservation = await createReservationService(req.body);
    res.status(201).json(reservation);
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const getReservationsByUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId?.[0] ?? '';
    const reservations = await getReservationsByUserService(userId);
    res.status(200).json(reservations);
  } catch (error) {
    handleServiceError(res, error);
  }
};
