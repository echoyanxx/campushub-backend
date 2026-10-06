import express, { Express } from 'express';
import mongoose from 'mongoose';
import { getEnv } from './config/env';
import healthRouter from './routes/health.route';
import resourceRouter from './routes/resource.routes';
import reservationRouter from './routes/reservation.routes';

export const app: Express = express();

const { MONGODB_URI, NODE_ENV } = getEnv();

const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[campushub-backend] connected to MongoDB');
  } catch (error) {
    console.error('[campushub-backend] MongoDB connection error:', error);
    if (NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

void connectToDatabase();

app.use(express.json());
app.use('/api/v1', healthRouter);
app.use('/api/v1', resourceRouter);
app.use('/api/v1', reservationRouter);
