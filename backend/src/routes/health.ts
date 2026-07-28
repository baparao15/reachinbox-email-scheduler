import { Router } from 'express';
import { checkDbConnection } from '../db';
import { checkRedisConnection } from '../queue/connection';
import { emailQueue } from '../queue/emailQueue';

export const healthRouter = Router();

/** Liveness + queue depth. Useful on camera during the restart demo. */
healthRouter.get('/', async (_req, res) => {
  const [dbOk, redisOk] = await Promise.all([checkDbConnection(), checkRedisConnection()]);

  let counts: Record<string, number> = {};
  try {
    counts = (await emailQueue.getJobCounts(
      'waiting',
      'active',
      'delayed',
      'completed',
      'failed',
      'prioritized',
    )) as unknown as Record<string, number>;
  } catch {
    counts = {};
  }

  const healthy = dbOk && redisOk;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    postgres: dbOk ? 'up' : 'down',
    redis: redisOk ? 'up' : 'down',
    queue: counts,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
