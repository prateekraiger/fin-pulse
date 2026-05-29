/**
 * Production-ready API middleware utilities
 *
 * Provides:
 *  - withMiddleware()  — compose security headers + error wrapper around any handler
 *  - getUserId()       — extract & validate user identity from request
 *  - validateBody()    — parse + assert required JSON fields
 *  - ApiError          — typed error class for clean HTTP responses
 *  - rateLimit()       — lightweight in-memory rate limiter (per IP)
 *  - cors()            — CORS pre-flight helper
 */

// ── Security headers returned on every API response ───────────────────────
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store',
};

// ── Typed API error ────────────────────────────────────────────────────────
export class ApiError extends Error {
  /**
   * @param {string} message   Human-readable error message
   * @param {number} status    HTTP status code (default 400)
   * @param {string} [code]    Machine-readable error code
   */
  constructor(message, status = 400, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code ?? 'API_ERROR';
  }
}

// ── Response helpers ───────────────────────────────────────────────────────
/**
 * Build a JSON Response with security headers.
 * @param {unknown} body
 * @param {number}  [status=200]
 * @param {Record<string,string>} [extraHeaders]
 */
export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { ...SECURITY_HEADERS, ...extraHeaders },
  });
}

/**
 * Build an error JSON Response.
 * @param {string} message
 * @param {number} [status=400]
 * @param {string} [code]
 */
export function errorResponse(message, status = 400, code) {
  return jsonResponse({ error: message, code: code ?? 'ERROR' }, status);
}

// ── User identity ──────────────────────────────────────────────────────────
/**
 * Extract the user ID from the request.
 *
 * Priority:
 *   1. `x-user-id` header  (set by the auth middleware / proxy)
 *   2. Falls back to "demo-user" so the app remains usable without auth
 *
 * In a fully auth-integrated deployment you would parse a JWT here instead.
 *
 * @param {Request} req
 * @returns {string}
 */
export function getUserId(req) {
  const id = req.headers.get('x-user-id');
  if (id && id.trim().length > 0) return id.trim();
  return 'demo-user';
}

// ── Body parsing ───────────────────────────────────────────────────────────
/**
 * Parse JSON body; throw ApiError on malformed JSON.
 * @param {Request} req
 * @returns {Promise<Record<string, unknown>>}
 */
export async function parseBody(req) {
  try {
    const body = await req.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new ApiError('Request body must be a JSON object', 400, 'INVALID_BODY');
    }
    return body;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Invalid JSON body', 400, 'INVALID_JSON');
  }
}

/**
 * Assert that required fields exist in `data` and are non-empty.
 * Throws an ApiError listing all missing fields.
 *
 * @param {Record<string, unknown>} data
 * @param {string[]} required
 */
export function requireFields(data, required) {
  const missing = required.filter(
    (k) => data[k] === undefined || data[k] === null || data[k] === ''
  );
  if (missing.length > 0) {
    throw new ApiError(
      `Missing required fields: ${missing.join(', ')}`,
      400,
      'MISSING_FIELDS'
    );
  }
}

// ── In-memory rate limiter ─────────────────────────────────────────────────
/** @type {Map<string, { count: number; resetAt: number }>} */
const _rateLimitStore = new Map();

// Prune expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of _rateLimitStore) {
    if (val.resetAt <= now) _rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Simple sliding-window rate limiter keyed on IP + route.
 *
 * @param {Request}  req
 * @param {object}   opts
 * @param {number}   [opts.limit=100]        Max requests per window
 * @param {number}   [opts.windowMs=60000]   Window size in milliseconds
 * @param {string}   [opts.keyPrefix='']     Namespace for the key
 * @returns {Response | null}  Returns a 429 Response if rate-limited, else null
 */
export function rateLimit(req, { limit = 100, windowMs = 60_000, keyPrefix = '' } = {}) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const entry = _rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    _rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count += 1;
  if (entry.count > limit) {
    return errorResponse('Too many requests — please try again later.', 429, 'RATE_LIMITED');
  }

  return null;
}

// ── CORS pre-flight ────────────────────────────────────────────────────────
/**
 * Handle OPTIONS pre-flight requests.
 * Returns a Response if this was a pre-flight, otherwise null.
 *
 * @param {Request} req
 * @param {string[]} [allowedOrigins=['*']]
 */
export function handleCors(req, allowedOrigins = ['*']) {
  const origin = req.headers.get('origin') ?? '';
  const allowed =
    allowedOrigins.includes('*') || allowedOrigins.includes(origin)
      ? origin || '*'
      : '';

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return corsHeaders; // caller merges these into the real response headers
}

// ── Request ID ────────────────────────────────────────────────────────────
/**
 * Generate a short unique request ID for log correlation.
 * @returns {string}
 */
export function requestId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Route wrapper ──────────────────────────────────────────────────────────
/**
 * Wrap an API handler with:
 *  - Structured error handling (ApiError → HTTP response, unknown → 500)
 *  - Security headers on every response
 *  - Request-ID logging
 *  - Optional rate limiting
 *
 * @param {(req: Request, ctx?: any) => Promise<Response>} handler
 * @param {object} [opts]
 * @param {boolean} [opts.rateLimit]         Enable default rate limiting
 * @param {number}  [opts.rateLimitMax]       Max requests per window (default 100)
 * @param {string}  [opts.routeName]          Used in error logs
 * @returns {(req: Request, ctx?: any) => Promise<Response>}
 */
export function withMiddleware(handler, opts = {}) {
  return async (req, ctx) => {
    const rid = requestId();
    const route = opts.routeName ?? new URL(req.url).pathname;

    // CORS pre-flight
    const corsResult = handleCors(req);
    if (corsResult instanceof Response) return corsResult;
    const corsHeaders = typeof corsResult === 'object' ? corsResult : {};

    // Rate limiting
    if (opts.rateLimit !== false) {
      const limited = rateLimit(req, {
        limit: opts.rateLimitMax ?? 100,
        keyPrefix: route,
      });
      if (limited) return limited;
    }

    try {
      const response = await handler(req, ctx);

      // Merge security + CORS headers into the handler's response
      const merged = new Response(response.body, response);
      for (const [k, v] of Object.entries({ ...SECURITY_HEADERS, ...corsHeaders })) {
        merged.headers.set(k, v);
      }
      merged.headers.set('X-Request-Id', rid);
      return merged;
    } catch (err) {
      if (err instanceof ApiError) {
        console.warn(`[${route}] ${rid} ApiError:`, err.message);
        return jsonResponse({ error: err.message, code: err.code }, err.status, {
          'X-Request-Id': rid,
        });
      }

      // Unexpected errors — log full details server-side, hide from client
      console.error(`[${route}] ${rid} Unhandled error:`, err);
      return jsonResponse(
        { error: 'An unexpected error occurred. Please try again.', code: 'INTERNAL_ERROR' },
        500,
        { 'X-Request-Id': rid }
      );
    }
  };
}
