import { Router } from 'express';
import {
  cancelReservation,
  createReservation,
  getReservationsByUser,
} from '../controllers/reservation.controller';

const router = Router();

router.post('/reservations', createReservation);
router.get('/reservations/user/:userId', getReservationsByUser);
router.patch('/reservations/:id/cancel', cancelReservation);

export default router;
