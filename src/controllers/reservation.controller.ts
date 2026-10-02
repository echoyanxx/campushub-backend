import { Request, Response } from 'express';
import { createReservation as createReservationService } from '../services/reservation.service';

export const createReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const reservation = await createReservationService(req.body);
    res.status(201).json(reservation);
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && 'payload' in error) {
      const apiError = error as { status: number; payload: { error?: string; message: string } };
      res.status(apiError.status).json(apiError.payload);
      return;
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};
