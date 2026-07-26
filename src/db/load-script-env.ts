/**
 * Environment loader for standalone scripts (seed, index migration).
 *
 * Next.js loads `.env.local` automatically, plain Node does not — so scripts
 * import this file first, before anything that reads `process.env`.
 */
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });
