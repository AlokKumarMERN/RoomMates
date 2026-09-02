import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Every environment variable the server needs, validated at boot.
 *
 * Validating here means a missing or malformed variable fails immediately with a
 * readable message, instead of surfacing as `undefined` somewhere deep in a
 * request handler hours later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Phase 2 uses these. Defined now so the boot check covers them from the start.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Comma-separated list of origins allowed to call the API.
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  console.error('Copy server/.env.example to server/.env and fill in the values.\n');
  process.exit(1);
}

const env = {
  ...parsed.data,
  allowedOrigins: parsed.data.CLIENT_URL.split(',').map((origin) => origin.trim()),
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
};

export default env;
