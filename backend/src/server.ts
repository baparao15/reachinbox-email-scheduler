import { createApp } from './app';
import { env } from './config/env';
import { closeDb } from './db';
import { runMigrations } from './db/migrate';
import { logger } from './lib/logger';
import { redis } from './queue/connection';
import { closeQueue } from './queue/emailQueue';

/**
 * API entrypoint. Runs as its own process; the BullMQ worker lives in
 * `src/workers/index.ts` and is started separately (`npm run dev:worker`).
 */
async function main() {
  await runMigrations();

  const app = createApp();
  const server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "API listening");
  });
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down API gracefully');

    server.close(async () => {
      try {
        await closeQueue();
        await redis.quit();
        await closeDb();
        logger.info('API shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during API shutdown');
        process.exit(1);
      }
    });

    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'API failed to start');
  process.exit(1);
});
