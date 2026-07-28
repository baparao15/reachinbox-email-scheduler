import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/** Coerces "true"/"false"/"1"/"0" strings into a real boolean. */
const boolish = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? defaultValue : v === 'true' || v === '1'));

const intish = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? defaultValue : Number(v)))
    .pipe(z.number().int().positive());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: intish(4000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  QUEUE_NAME: z.string().default('email-send'),

  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),

  WORKER_CONCURRENCY: intish(5),

  MIN_DELAY_MS: intish(2000),
  MIN_DELAY_MS_FLOOR: intish(1000),

  MAX_EMAILS_PER_HOUR_PER_SENDER: intish(200),
  MAX_EMAILS_PER_HOUR_PER_SENDER_CEILING: intish(500),

  RECONCILE_ON_BOOT: boolish(true),
  STALE_PROCESSING_MS: intish(300_000),

  JOB_ATTEMPTS: intish(3),
  JOB_BACKOFF_MS: intish(5000),

  SENDER_COUNT: intish(3),
  ETHEREAL_ACCOUNTS: z.string().optional().default(''),
  DRY_RUN: boolish(false),

  MAX_UPLOAD_BYTES: intish(5 * 1024 * 1024),
  MAX_RECIPIENTS_PER_CAMPAIGN: intish(50_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`\nInvalid environment configuration:\n${issues}\n\nCopy .env.example to .env and fill it in.\n`);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';

/** One hour in ms — the rate-limit window size. */
export const HOUR_MS = 3_600_000;
