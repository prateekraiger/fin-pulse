/**
 * Database schema initialisation for FinPulse.
 *
 * Calling `ensureSchema()` is idempotent — it uses `IF NOT EXISTS` throughout
 * so it can be called on every server start without risk.
 *
 * Tables:
 *   - user_profiles
 *   - gst_settings
 *   - income_entries
 *   - expenses
 *   - invoices
 *   - tds_entries
 *   - compliance_tasks
 */

import sql from "./sql.js";

const SCHEMA_SQL = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ───────────────────── user_profiles ─────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT UNIQUE NOT NULL,
  profile_type  TEXT NOT NULL,
  state         TEXT NOT NULL,
  state_category TEXT NOT NULL,
  service_type  TEXT,
  digital_receipts_majority BOOLEAN DEFAULT false,
  current_fy    TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);

-- ───────────────────── gst_settings ──────────────────────
CREATE TABLE IF NOT EXISTS gst_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT UNIQUE NOT NULL,
  gst_registered  BOOLEAN DEFAULT false,
  gstin           TEXT,
  threshold_limit NUMERIC(15,2) DEFAULT 2000000,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gst_settings_user_id ON gst_settings (user_id);

-- ───────────────────── income_entries ─────────────────────
CREATE TABLE IF NOT EXISTS income_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  fy              TEXT NOT NULL,
  source_type     TEXT NOT NULL,
  client_name     TEXT NOT NULL,
  description     TEXT,
  amount          NUMERIC(15,2) NOT NULL,
  currency        TEXT DEFAULT 'INR',
  exchange_rate   NUMERIC(10,4) DEFAULT 1,
  inr_amount      NUMERIC(15,2) NOT NULL,
  payment_status  TEXT NOT NULL,
  settlement_date DATE,
  invoice_id      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_entries_user_fy ON income_entries (user_id, fy);

-- ───────────────────── expenses ──────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL,
  fy                  TEXT NOT NULL,
  category            TEXT NOT NULL,
  description         TEXT NOT NULL,
  amount              NUMERIC(15,2) NOT NULL,
  expense_date        DATE NOT NULL,
  is_recurring        BOOLEAN DEFAULT false,
  recurring_frequency TEXT,
  business_percentage NUMERIC(5,2) DEFAULT 100,
  receipt_url         TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_fy ON expenses (user_id, fy);

-- ───────────────────── invoices ──────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  fy              TEXT NOT NULL,
  invoice_number  TEXT,
  client_name     TEXT NOT NULL,
  description     TEXT,
  amount          NUMERIC(15,2) NOT NULL,
  gst_applied     BOOLEAN DEFAULT false,
  gst_amount      NUMERIC(15,2) DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL,
  invoice_date    DATE NOT NULL,
  due_date        DATE,
  payment_status  TEXT DEFAULT 'unpaid',
  payment_date    DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_fy ON invoices (user_id, fy);

-- ───────────────────── tds_entries ───────────────────────
CREATE TABLE IF NOT EXISTS tds_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL,
  fy                  TEXT NOT NULL,
  deductor_name       TEXT NOT NULL,
  deductor_tan        TEXT,
  amount_credited     NUMERIC(15,2) NOT NULL,
  tds_deducted        NUMERIC(15,2) NOT NULL,
  tds_date            DATE NOT NULL,
  form_26as_verified  BOOLEAN DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tds_entries_user_fy ON tds_entries (user_id, fy);

-- ───────────────────── compliance_tasks ──────────────────
CREATE TABLE IF NOT EXISTS compliance_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE NOT NULL,
  completed   BOOLEAN DEFAULT false,
  category    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_tasks_user ON compliance_tasks (user_id, completed, due_date);
`;

let _schemaInitialised = false;

/**
 * Run the schema DDL exactly once per process lifetime.
 * Safe to call from multiple request handlers — subsequent calls are no-ops.
 */
export async function ensureSchema() {
  if (_schemaInitialised) return;
  try {
    await sql(SCHEMA_SQL);
    _schemaInitialised = true;
    console.info("[schema] Database tables ensured successfully.");
  } catch (error) {
    // Log but don't throw — the tables may already exist via other means.
    // If the DB is truly unreachable, individual queries will fail and surface errors.
    console.error("[schema] Failed to ensure database tables:", error?.message || error);
  }
}

export default ensureSchema;
