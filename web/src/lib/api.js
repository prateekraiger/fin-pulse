/**
 * FinPulse API client library.
 *
 * Provides a thin, production-ready wrapper around `fetch` with:
 *  - automatic JSON headers and user-id injection
 *  - retry with exponential back-off for transient errors
 *  - configurable request timeouts
 *  - structured error objects
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const USER_ID = "demo-user";

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 15_000;

/** Maximum number of retry attempts for transient (5xx / network) errors. */
const MAX_RETRIES = 2;

/** Initial back-off delay in ms (doubles each retry). */
const INITIAL_BACKOFF_MS = 500;

/** HTTP status codes that are considered transient and eligible for retry. */
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504, 408, 429]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build default headers for every request.
 * @param {Record<string, string>} extra
 * @returns {Record<string, string>}
 */
function headers(extra = {}) {
  return {
    "Content-Type": "application/json",
    "x-user-id": USER_ID,
    ...extra,
  };
}

/**
 * Custom error class carrying the HTTP status code.
 */
class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {*} [body]
   */
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Sleep for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

/**
 * Perform an HTTP request with timeout, retry, and error handling.
 *
 * @param {string} url
 * @param {RequestInit & { timeout?: number, retries?: number }} [options]
 * @returns {Promise<any>} Parsed JSON body
 * @throws {ApiError} On 4xx / exhausted retries / timeout
 */
async function request(url, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    retries = MAX_RETRIES,
    ...fetchOptions
  } = options;

  fetchOptions.headers = headers(fetchOptions.headers);

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    try {
      const res = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Non-retryable client error (4xx)
      if (res.status >= 400 && res.status < 500) {
        let body;
        try {
          body = await res.json();
        } catch {
          body = await res.text().catch(() => res.statusText);
        }
        const message =
          (body && typeof body === "object" && body.error) ||
          (typeof body === "string" ? body : `Request failed: ${res.status}`);
        throw new ApiError(message, res.status, body);
      }

      // Retryable server error (5xx)
      if (res.status >= 500 || RETRYABLE_STATUS_CODES.has(res.status)) {
        const text = await res.text().catch(() => res.statusText);
        lastError = new ApiError(
          text || `Server error: ${res.status}`,
          res.status
        );
        // Fall through to retry logic below
      } else {
        // Success (2xx / 3xx)
        return await res.json();
      }
    } catch (err) {
      clearTimeout(timeoutId);

      // Don't retry client errors
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        throw err;
      }

      // Timeout
      if (err.name === "AbortError") {
        lastError = new ApiError("Request timed out", 0);
      } else if (!(err instanceof ApiError)) {
        // Network error
        lastError = new ApiError(err.message || "Network error", 0);
      } else {
        lastError = err;
      }
    }

    // Exponential back-off before next retry
    if (attempt < retries) {
      await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
    }
  }

  // All retries exhausted
  throw lastError;
}

// ---------------------------------------------------------------------------
// API modules
// ---------------------------------------------------------------------------

/** Profile API */
export const profileApi = {
  get: () => request("/api/profile"),
  save: (data) =>
    request("/api/profile", { method: "POST", body: JSON.stringify(data) }),
};

/** Dashboard API */
export const dashboardApi = {
  get: (fy) => request(`/api/dashboard?fy=${encodeURIComponent(fy)}`),
};

/** Income API */
export const incomeApi = {
  list: (fy) => request(`/api/income?fy=${encodeURIComponent(fy)}`),
  create: (data) =>
    request("/api/income", { method: "POST", body: JSON.stringify(data) }),
  update: (data) =>
    request("/api/income", { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) =>
    request(`/api/income?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/** Invoices API */
export const invoicesApi = {
  list: (fy) => request(`/api/invoices?fy=${encodeURIComponent(fy)}`),
  create: (data) =>
    request("/api/invoices", { method: "POST", body: JSON.stringify(data) }),
  update: (data) =>
    request("/api/invoices", { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) =>
    request(`/api/invoices?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/** Expenses API */
export const expensesApi = {
  list: (fy) => request(`/api/expenses?fy=${encodeURIComponent(fy)}`),
  create: (data) =>
    request("/api/expenses", { method: "POST", body: JSON.stringify(data) }),
  update: (data) =>
    request("/api/expenses", { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) =>
    request(`/api/expenses?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/** GST API */
export const gstApi = {
  status: (fy) => request(`/api/gst/status?fy=${encodeURIComponent(fy)}`),
};

/** Tax API */
export const taxApi = {
  estimate: (fy) => request(`/api/tax/estimate?fy=${encodeURIComponent(fy)}`),
};

/** TDS API */
export const tdsApi = {
  list: (fy) => request(`/api/tds?fy=${encodeURIComponent(fy)}`),
  create: (data) =>
    request("/api/tds", { method: "POST", body: JSON.stringify(data) }),
  remove: (id) =>
    request(`/api/tds?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/** Health API */
export const healthApi = {
  check: () => request("/api/health", { retries: 0 }),
};

// Re-export for external use
export { ApiError };
