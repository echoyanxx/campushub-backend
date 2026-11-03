import { Request, Response } from 'express';
import {
  cancelReservation as cancelReservationService,
  createReservation as createReservationService,
  getReservationsByUser as getReservationsByUserService,
} from '../services/reservation.service';
import type { CreateReservationRequest, ErrorResponse, Reservation } from '../../shared/api';
import { createReservationSchema, identifierSchema } from '../validation/reservation.validation';

export const createReservation = async (
  req: Request<Record<string, string>, Reservation | ErrorResponse, unknown>,
  res: Response<Reservation | ErrorResponse>,
): Promise<void> => {
  const input: CreateReservationRequest = createReservationSchema.parse(req.body);
  const reservation = await createReservationService(input);
  res.status(201).json(reservation);
};

export const getReservationsByUser = async (
  req: Request<{ userId: string }>,
  res: Response<Reservation[] | ErrorResponse>,
): Promise<void> => {
  const userId: string = identifierSchema.parse(req.params.userId);
  const reservations = await getReservationsByUserService(userId);
  res.status(200).json(reservations);
};

export const cancelReservation = async (
  req: Request<{ id: string }, Reservation | ErrorResponse, unknown>,
  res: Response<Reservation | ErrorResponse>,
): Promise<void> => {
  const id: string = identifierSchema.parse(req.params.id);
  const reservation = await cancelReservationService(id);
  res.status(200).json(reservation);
};
