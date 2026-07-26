import { handlers } from '@/lib/auth';

/**
 * Auth.js v5 catch-all handler.
 *
 * Serves sign-in / sign-out / session / CSRF and every OAuth callback.
 * Runs on the Node.js runtime because the credentials provider talks to
 * Mongoose and bcrypt, neither of which run on the edge.
 */
export const runtime = 'nodejs';

export const { GET, POST } = handlers;
