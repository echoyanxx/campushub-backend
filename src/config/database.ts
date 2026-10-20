import mongoose from 'mongoose';
import { getEnv } from './env';

export const connectToDatabase = async (): Promise<void> => {
  await mongoose.connect(getEnv().MONGODB_URI);
};
