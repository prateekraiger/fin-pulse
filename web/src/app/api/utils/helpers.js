/**
 * Shared backend utilities for FinPulse API routes.
 * Provides centralized authentication, validation, error handling, and constants.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Financial year pattern: e.g. "2024-25" */
const FY_REGEX = /^\d{4}-\d{2}$/;

/** UUID v4 pattern */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Safe SQL column name pattern (lowercase letters, digits, underscores) */
const SAFE_COLUMN_REGEX = /^[a-z_][a-z0-9_]*$/;

/** Maximum page size for list queries */
const MAX_PAGE_SIZE = 200;

/** Default page size for list queries */
const DEFAULT_PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Extract user ID from the request.
 * In production this should read from a verified JWT/session;
 * for now it falls back to the `x-user-id` header or "demo-user".
 *
 * @param {Request} req
 * @returns {string}
 */
function getUserId(req) {
  const headerValue = req.headers.get("x-user-id");
  if (headerValue && typeof headerValue === "string" && headerValue.trim().length > 0) {
    // Sanitise: strip anything that isn't alphanumeric, dash, or underscore
    return headerValue.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);
  }
  return "demo-user";
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a value is a non-empty string.
 * @param {*} value
 * @param {string} name - field name for error messages
 * @returns {{ valid: boolean, error?: string }}
 */
function requireString(value, name) {
  if (value === undefined || value === null || (typeof value === "string" && value.trim().length === 0)) {
    return { valid: false, error: `${name} is required` };
  }
  if (typeof value !== "string") {
    return { valid: false, error: `${name} must be a string` };
  }
  return { valid: true };
}

/**
 * Validate that a value is a positive number (or zero).
 * @param {*} value
 * @param {string} name
 * @param {{ allowZero?: boolean, max?: number }} [opts]
 * @returns {{ valid: boolean, parsed?: number, error?: string }}
 */
function requirePositiveNumber(value, name, opts = {}) {
  const { allowZero = true, max } = opts;
  const parsed = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(parsed)) {
    return { valid: false, error: `${name} must be a valid number` };
  }
  if (!allowZero && parsed === 0) {
    return { valid: false, error: `${name} must be greater than zero` };
  }
  if (parsed < 0) {
    return { valid: false, error: `${name} must not be negative` };
  }
  if (max !== undefined && parsed > max) {
    return { valid: false, error: `${name} must be at most ${max}` };
  }
  return { valid: true, parsed };
}

/**
 * Validate financial year format (e.g. "2024-25").
 * @param {*} value
 * @returns {{ valid: boolean, error?: string }}
 */
function requireFY(value) {
  if (!value || typeof value !== "string") {
    return { valid: false, error: "fy parameter is required" };
  }
  if (!FY_REGEX.test(value)) {
    return { valid: false, error: "fy must be in YYYY-YY format (e.g. 2024-25)" };
  }
  return { valid: true };
}

/**
 * Validate a date string (ISO format YYYY-MM-DD).
 * @param {*} value
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
function requireDate(value, name) {
  if (!value || typeof value !== "string") {
    return { valid: false, error: `${name} is required` };
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return { valid: false, error: `${name} must be a valid date (YYYY-MM-DD)` };
  }
  return { valid: true };
}

/**
 * Validate a UUID string.
 * @param {*} value
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
function requireId(value, name = "id") {
  if (!value || typeof value !== "string") {
    return { valid: false, error: `${name} is required` };
  }
  // Allow both UUID and simple numeric/string IDs
  if (value.trim().length === 0 || value.length > 128) {
    return { valid: false, error: `${name} is invalid` };
  }
  return { valid: true };
}

/**
 * Check if a column name is safe for dynamic SQL usage.
 * @param {string} name
 * @returns {boolean}
 */
function isSafeColumnName(name) {
  return SAFE_COLUMN_REGEX.test(name);
}

/**
 * Filter an object to only include keys present in the allowedSet AND safe for SQL.
 * @param {Object} obj
 * @param {Set<string>} allowedSet
 * @returns {Object}
 */
function filterToAllowedFields(obj, allowedSet) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (allowedSet.has(key) && isSafeColumnName(key)) {
      result[key] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Response builders
// ---------------------------------------------------------------------------

/**
 * Build a JSON success response.
 * @param {*} data
 * @param {number} [status=200]
 * @returns {Response}
 */
function jsonResponse(data, status = 200) {
  return Response.json(data, { status });
}

/**
 * Build a JSON error response.
 * @param {string} message
 * @param {number} [status=400]
 * @returns {Response}
 */
function errorResponse(message, status = 400) {
  return Response.json({ error: message }, { status });
}

/**
 * Build a 500 Internal Server Error response and log the error.
 * @param {string} context - e.g. "GET /api/dashboard"
 * @param {Error} error
 * @returns {Response}
 */
function serverError(context, error) {
  console.error(`${context}:`, error?.message || error);
  return Response.json(
    { error: "An internal server error occurred. Please try again later." },
    { status: 500 }
  );
}

// ---------------------------------------------------------------------------
// Request body parsing
// ---------------------------------------------------------------------------

/**
 * Safely parse JSON request body. Returns { data, error }.
 * @param {Request} request
 * @returns {Promise<{ data?: any, error?: Response }>}
 */
async function parseJsonBody(request) {
  try {
    const data = await request.json();
    if (!data || typeof data !== "object") {
      return { error: errorResponse("Request body must be a JSON object") };
    }
    return { data };
  } catch (e) {
    return { error: errorResponse("Invalid JSON in request body") };
  }
}

// ---------------------------------------------------------------------------
// Dynamic UPDATE query builder
// ---------------------------------------------------------------------------

/**
 * Build a parameterised UPDATE query from filtered fields.
 * Column names come from a validated whitelist — never from user input.
 *
 * @param {string} table
 * @param {Object} fields - key/value pairs to set
 * @param {string} userId
 * @param {string} id
 * @param {{ addUpdatedAt?: boolean }} [opts]
 * @returns {{ query: string, params: any[] }}
 */
function buildUpdateQuery(table, fields, userId, id, opts = {}) {
  const { addUpdatedAt = true } = opts;
  const keys = Object.keys(fields);
  const setClauses = keys.map((k, i) => `"${k}" = $${i + 3}`).join(", ");
  const updatedAtClause = addUpdatedAt ? ", updated_at = NOW()" : "";
  const query = `UPDATE ${table} SET ${setClauses}${updatedAtClause} WHERE id = $1 AND user_id = $2 RETURNING *`;
  const params = [id, userId, ...keys.map((k) => fields[k])];
  return { query, params };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  // Constants
  FY_REGEX,
  UUID_REGEX,
  SAFE_COLUMN_REGEX,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  // Auth
  getUserId,
  // Validators
  requireString,
  requirePositiveNumber,
  requireFY,
  requireDate,
  requireId,
  isSafeColumnName,
  filterToAllowedFields,
  // Responses
  jsonResponse,
  errorResponse,
  serverError,
  // Body parsing
  parseJsonBody,
  // Query building
  buildUpdateQuery,
};
