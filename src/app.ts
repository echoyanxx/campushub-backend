import express, { Express } from 'express';
import healthRouter from './routes/health.route';

export const app: Express = express();

app.use(express.json());
app.use('/api/v1', healthRouter);
