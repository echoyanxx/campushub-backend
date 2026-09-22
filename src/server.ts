import { app } from './app';
import { getEnv } from './config/env';

const { PORT } = getEnv();

app.listen(PORT, () => {
  console.log(`[campushub-backend] listening on http://localhost:${PORT}`);
});
