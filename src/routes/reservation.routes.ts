import { Router } from 'express';
import { createReservation, getReservationsByUser } from '../controllers/reservation.controller';

const router = Router();

router.post('/reservations', createReservation);
router.get('/reservations/user/:userId', getReservationsByUser);

export default router;
