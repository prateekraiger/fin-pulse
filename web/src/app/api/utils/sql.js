/**
 * Production-ready Neon PostgreSQL client
 *
 * Features:
 *  - Lazy singleton connection (one shared neon() instance per process)
 *  - Graceful "no DB" fallback with a clear error message
 *  - Named transaction helper: sql.transaction(async (tx) => { ... })
 *  - Query logger in development (DATABASE_DEBUG=true)
 *  - Health-check helper for liveness / readiness probes
 *  - isDatabaseHealthy() named export consumed by /api/health route
 */

import { neon, neonConfig } from '@neondatabase/serverless';

// ── Neon configuration ─────────────────────────────────────────────────────
// Cache fetch connections for better reuse across requests.
neonConfig.fetchConnectionCache = true;

// ── Helpers ────────────────────────────────────────────────────────────────
const isDev   = process.env.NODE_ENV !== 'production';
const debugSql = process.env.DATABASE_DEBUG === 'true';

function log(...args) {
  if (isDev && debugSql) console.debug('[sql]', ...args);
}

// ── Null-safe fallback ─────────────────────────────────────────────────────
const DB_MISSING_MSG =
  'DATABASE_URL environment variable is not set. ' +
  'Add it to your .env file or deployment environment.';

function createNullSql() {
  const fn = () => { throw new Error(DB_MISSING_MSG); };
  fn[Symbol.toPrimitive] = () => DB_MISSING_MSG;
  fn.transaction = () => { throw new Error(DB_MISSING_MSG); };
  return fn;
}

// ── Singleton factory ──────────────────────────────────────────────────────
let _rawSql = null;

function getRawSql() {
  if (_rawSql) return _rawSql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    _rawSql = createNullSql();
    if (isDev) {
      console.warn('[sql] No DATABASE_URL — DB calls will throw at runtime.');
    }
    return _rawSql;
  }

  _rawSql = neon(url, { fullResults: false, arrayMode: false });
  return _rawSql;
}

// ── Health-check helper ────────────────────────────────────────────────────
/**
 * Quick connectivity check.  Returns `true` if the DB is reachable.
 * Used by monitoring / readiness probes (e.g. /api/health).
 *
 * @returns {Promise<boolean>}
 */
export async function isDatabaseHealthy() {
  if (!process.env.DATABASE_URL) return false;
  try {
    const raw = getRawSql();
    await raw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// ── Transaction helper ─────────────────────────────────────────────────────
/**
 * Run a set of queries in a database transaction.
 *
 * Usage:
 *   const result = await sql.transaction(async (tx) => {
 *     const [row] = await tx`INSERT INTO ... RETURNING *`;
 *     await tx`UPDATE ... SET ...`;
 *     return row;
 *   });
 *
 * @param {(tx: Function) => Promise<unknown>} callback
 * @returns {Promise<unknown>}
 */
async function transaction(callback) {
  const raw = getRawSql();
  try {
    await raw`BEGIN`;
    let result;
    try {
      result = await callback(raw);
      await raw`COMMIT`;
    } catch (err) {
      await raw`ROLLBACK`;
      throw err;
    }
    return result;
  } catch (err) {
    console.error('[sql] Transaction error:', err?.message ?? err);
    throw err;
  }
}

// ── Proxy wrapper (adds .transaction + optional debug logging) ─────────────
/**
 * The default export is a proxy around the neon() tagged-template function.
 * It supports both:
 *   sql`SELECT * FROM t WHERE id = ${id}`   ← tagged template
 *   sql("SELECT * FROM t WHERE id = $1", [id])  ← parameterised string
 *
 * Extra methods:
 *   sql.transaction(cb)  ← transaction helper (see above)
 */
const sql = new Proxy(
  function sql() {},  // dummy target — all behaviour is in the proxy
  {
    apply(_target, _thisArg, args) {
      const raw = getRawSql();
      const start = isDev && debugSql ? Date.now() : 0;
      const result = raw(...args);
      if (start && result && typeof result.then === 'function') {
        result.then(() => log(`query done in ${Date.now() - start}ms`)).catch(() => {});
      }
      return result;
    },
    get(_target, prop) {
      if (prop === 'transaction') return transaction;
      const raw = getRawSql();
      const val = raw[prop];
      return typeof val === 'function' ? val.bind(raw) : val;
    },
  }
);

export default sql;
