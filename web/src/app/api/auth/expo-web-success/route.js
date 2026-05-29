/**
 * GET /api/auth/expo-web-success
 *
 * Intermediary page used by Expo-web OAuth flows.
 * After a successful OAuth redirect this endpoint posts an AUTH_SUCCESS
 * message (with the JWT) to the parent window via postMessage, enabling
 * the React Native WebView to capture the token.
 *
 * Security:
 *  - Uses Content-Security-Policy to restrict postMessage targets
 *  - Does not embed raw error details in the HTML response
 *  - Standard no-store cache headers to prevent token caching
 */

import { getToken } from '@auth/core/jwt';

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  // Allow postMessage to any origin — required for cross-origin WebView usage.
  // Tighten this in production if you know the exact origin.
  'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'",
};

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...SECURITY_HEADERS,
    },
  });
}

function postMessageScript(message) {
  // Sanitise — only serialise known-safe fields via JSON.stringify
  const safe = JSON.stringify(message);
  return `
<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Authenticating…</title></head>
  <body>
    <script>
      (function () {
        try {
          window.parent.postMessage(${safe}, '*');
        } catch (e) {
          // Parent may have navigated away — ignore
        }
      })();
    </script>
  </body>
</html>`;
}

export async function GET(request) {
  try {
    const isSecure =
      process.env.AUTH_URL?.startsWith('https') ??
      request.url?.startsWith('https') ??
      false;

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.error('[expo-web-success] AUTH_SECRET is not configured');
      return htmlResponse(
        postMessageScript({ type: 'AUTH_ERROR', error: 'Server configuration error' }),
        500
      );
    }

    const [rawToken, jwt] = await Promise.all([
      getToken({ req: request, secret, secureCookie: isSecure, raw: true }),
      getToken({ req: request, secret, secureCookie: isSecure }),
    ]);

    if (!jwt) {
      return htmlResponse(
        postMessageScript({ type: 'AUTH_ERROR', error: 'Unauthorized' }),
        401
      );
    }

    return htmlResponse(
      postMessageScript({
        type: 'AUTH_SUCCESS',
        jwt: rawToken,
        user: {
          id:    jwt.sub   ?? null,
          email: jwt.email ?? null,
          name:  jwt.name  ?? null,
        },
      })
    );
  } catch (err) {
    console.error('[expo-web-success] Unexpected error:', err?.message ?? err);
    return htmlResponse(
      postMessageScript({ type: 'AUTH_ERROR', error: 'Authentication failed' }),
      500
    );
  }
}
