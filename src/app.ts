import express, { Express } from 'express';
import healthRouter from './routes/health.route';
import reservationRouter from './routes/reservation.routes';

export const app: Express = express();

app.use(express.json());
app.use('/api/v1', healthRouter);
app.use('/api/v1', reservationRouter);
