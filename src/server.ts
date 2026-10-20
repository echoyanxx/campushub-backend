import { app } from './app';
import { connectToDatabase } from './config/database';
import { getEnv } from './config/env';

const { PORT } = getEnv();

const startServer = async (): Promise<void> => {
  try {
    await connectToDatabase();
    app.listen(PORT, (): void => {
      console.log(`[campushub-backend] listening on http://localhost:${PORT}`);
    });
  } catch {
    console.error('[campushub-backend] Unable to connect to MongoDB. Check MONGODB_URI.');
    process.exitCode = 1;
  }
};

void startServer();
