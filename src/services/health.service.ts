export interface HealthStatus {
  status: 'ok';
  service: string;
  timestamp: string;
}

export const getHealthStatus = (): HealthStatus => ({
  status: 'ok',
  service: 'campushub-backend',
  timestamp: new Date().toISOString(),
});
