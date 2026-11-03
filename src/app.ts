import express, { Express } from 'express';
import healthRouter from './routes/health.route';
import resourceRouter from './routes/resource.routes';
import reservationRouter from './routes/reservation.routes';
import { errorHandler } from './middleware/errorHandler';

export const app: Express = express();

app.use(express.json());
app.use('/api/v1', healthRouter);
app.use('/api/v1', resourceRouter);
app.use('/api/v1', reservationRouter);
app.use(errorHandler);
