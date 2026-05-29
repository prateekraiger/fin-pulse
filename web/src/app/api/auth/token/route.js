/**
 * GET /api/auth/token
 *
 * Returns the signed JWT and basic user info for the currently authenticated
 * session.  Used by the Expo mobile app and any other clients that need to
 * exchange a session cookie for a raw JWT.
 *
 * Security:
 *  - Only returns data when a valid session exists
 *  - Adds standard security headers (no-store, X-Content-Type-Options, …)
 *  - Responds with 401 when unauthenticated
 */

import { getToken } from '@auth/core/jwt';

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...SECURITY_HEADERS,
    },
  });
}

export async function GET(request) {
  try {
    const isSecure =
      process.env.AUTH_URL?.startsWith('https') ??
      request.url?.startsWith('https') ??
      false;

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.error('[/api/auth/token] AUTH_SECRET is not configured');
      return json({ error: 'Server configuration error' }, 500);
    }

    const [rawToken, jwt] = await Promise.all([
      getToken({
        req: request,
        secret,
        secureCookie: isSecure,
        raw: true,
      }),
      getToken({
        req: request,
        secret,
        secureCookie: isSecure,
      }),
    ]);

    if (!jwt) {
      return json({ error: 'Unauthorized' }, 401);
    }

    return json({
      jwt: rawToken,
      user: {
        id:    jwt.sub   ?? null,
        email: jwt.email ?? null,
        name:  jwt.name  ?? null,
      },
    });
  } catch (err) {
    console.error('[/api/auth/token] Unexpected error:', err?.message ?? err);
    return json({ error: 'Failed to retrieve auth token' }, 500);
  }
}
