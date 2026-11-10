// Keep configuration tests independent of local credentials and .env files.
jest.mock('dotenv', (): { config: jest.Mock } => ({ config: jest.fn() }));

const originalEnvironment: Record<string, string | undefined> = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI,
};

afterEach((): void => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('backend environment configuration', (): void => {
  it('uses development defaults when environment variables are absent', async (): Promise<void> => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.MONGODB_URI;

    // env.ts reads configuration at import time; isolate its module cache per test.
    await jest.isolateModulesAsync(async (): Promise<void> => {
      const { getEnv } = await import('../env');
      expect(getEnv()).toEqual({
        PORT: 3000,
        NODE_ENV: 'development',
        MONGODB_URI: 'mongodb://localhost:27017/campushub',
      });
    });
  });

  it('reads configured values and converts the port to a number', async (): Promise<void> => {
    process.env.PORT = '4100';
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/configuration_test';

    await jest.isolateModulesAsync(async (): Promise<void> => {
      const { getEnv } = await import('../env');
      expect(getEnv()).toEqual({
        PORT: 4100,
        NODE_ENV: 'test',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/configuration_test',
      });
    });
  });
});
