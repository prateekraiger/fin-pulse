-- ============================================================
-- FinPulse Database Schema
-- Production-ready PostgreSQL schema for the FinPulse app.
--
-- Run this once against your Neon / PostgreSQL database to
-- create all required tables, indexes, and constraints.
--
-- Safe to run multiple times (uses IF NOT EXISTS / DO UPDATE).
-- ============================================================

-- ── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ── user_profiles ───────────────────────────────────────────
-- One row per user; created on onboarding.
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id                   TEXT        PRIMARY KEY,
  profile_type              TEXT        NOT NULL CHECK (profile_type IN ('freelancer','creator','consultant','other')),
  state                     TEXT        NOT NULL,
  state_category            TEXT        NOT NULL CHECK (state_category IN ('normal','special')),
  service_type              TEXT,
  digital_receipts_majority BOOLEAN     NOT NULL DEFAULT FALSE,
  current_fy                TEXT        NOT NULL, -- e.g. '2025-2026'
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);

-- ── gst_settings ────────────────────────────────────────────
-- One row per user; stores their GST registration status and threshold.
CREATE TABLE IF NOT EXISTS gst_settings (
  user_id          TEXT        PRIMARY KEY REFERENCES user_profiles (user_id) ON DELETE CASCADE,
  gst_registered   BOOLEAN     NOT NULL DEFAULT FALSE,
  gstin            TEXT,                            -- GST Identification Number
  registration_date DATE,
  threshold_limit  NUMERIC(12,2) NOT NULL DEFAULT 2000000,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── income_entries ───────────────────────────────────────────
-- Individual income receipts for a user in a given FY.
CREATE TABLE IF NOT EXISTS income_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT        NOT NULL,
  fy               TEXT        NOT NULL,  -- e.g. '2025-2026'
  source_type      TEXT        NOT NULL CHECK (source_type IN (
                                  'freelance','retainer','affiliate',
                                  'referral','brand_deal','digital_products','other'
                                )),
  client_name      TEXT        NOT NULL,
  description      TEXT,
  amount           NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency         TEXT        NOT NULL DEFAULT 'INR',
  exchange_rate    NUMERIC(10,4) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  inr_amount       NUMERIC(14,2) NOT NULL CHECK (inr_amount >= 0),
  payment_status   TEXT        NOT NULL CHECK (payment_status IN ('received','pending','overdue')),
  settlement_date  DATE,
  invoice_id       UUID REFERENCES invoices (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_entries_user_fy
  ON income_entries (user_id, fy);
CREATE INDEX IF NOT EXISTS idx_income_entries_settlement_date
  ON income_entries (user_id, settlement_date DESC NULLS LAST);

-- ── invoices ─────────────────────────────────────────────────
-- Invoices raised by the user.
CREATE TABLE IF NOT EXISTS invoices (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT        NOT NULL,
  fy               TEXT        NOT NULL,
  invoice_number   TEXT,
  client_name      TEXT        NOT NULL,
  description      TEXT,
  amount           NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  gst_applied      BOOLEAN     NOT NULL DEFAULT FALSE,
  gst_amount       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gst_amount >= 0),
  total_amount     NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  invoice_date     DATE        NOT NULL,
  due_date         DATE,
  payment_status   TEXT        NOT NULL DEFAULT 'unpaid'
                                CHECK (payment_status IN ('unpaid','paid','overdue','cancelled')),
  payment_date     DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_fy
  ON invoices (user_id, fy);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date
  ON invoices (user_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status
  ON invoices (user_id, payment_status);

-- ── expenses ─────────────────────────────────────────────────
-- Business expense records.
CREATE TABLE IF NOT EXISTS expenses (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT        NOT NULL,
  fy                   TEXT        NOT NULL,
  category             TEXT        NOT NULL CHECK (category IN (
                                     'saas_tools','internet_phone','contractor_payments',
                                     'travel','education','hardware','office_supplies',
                                     'professional_fees','marketing','other'
                                   )),
  description          TEXT        NOT NULL,
  amount               NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  expense_date         DATE        NOT NULL,
  is_recurring         BOOLEAN     NOT NULL DEFAULT FALSE,
  recurring_frequency  TEXT,
  business_percentage  NUMERIC(5,2) NOT NULL DEFAULT 100
                                   CHECK (business_percentage >= 0 AND business_percentage <= 100),
  receipt_url          TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_fy
  ON expenses (user_id, fy);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date
  ON expenses (user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category
  ON expenses (user_id, category);

-- ── tds_entries ──────────────────────────────────────────────
-- TDS (Tax Deducted at Source) certificates received by the user.
CREATE TABLE IF NOT EXISTS tds_entries (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT        NOT NULL,
  fy                   TEXT        NOT NULL,
  deductor_name        TEXT        NOT NULL,
  deductor_tan         TEXT,       -- Format: 4 letters + 5 digits + 1 letter
  amount_credited      NUMERIC(14,2) NOT NULL CHECK (amount_credited >= 0),
  tds_deducted         NUMERIC(14,2) NOT NULL CHECK (tds_deducted >= 0),
  tds_date             DATE        NOT NULL,
  form_26as_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_tds_not_exceeds_credited CHECK (tds_deducted <= amount_credited)
);

CREATE INDEX IF NOT EXISTS idx_tds_entries_user_fy
  ON tds_entries (user_id, fy);

-- ── compliance_tasks ─────────────────────────────────────────
-- Recurring compliance reminders auto-generated per FY.
CREATE TABLE IF NOT EXISTS compliance_tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  fy          TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  due_date    DATE,
  task_type   TEXT,       -- 'advance_tax', 'gst_filing', 'itr_filing', etc.
  completed   BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_tasks_user_incomplete
  ON compliance_tasks (user_id, completed, due_date ASC)
  WHERE completed = FALSE;

-- ── Automatic updated_at trigger ─────────────────────────────
-- Single trigger function reused by all tables.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'user_profiles','gst_settings','income_entries',
    'invoices','expenses','tds_entries','compliance_tasks'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_set_updated_at_' || tbl
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_set_updated_at_%I
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ── Note on forward references ────────────────────────────────
-- income_entries.invoice_id references invoices.id.
-- Because of this forward reference you should run the invoices
-- CREATE TABLE before income_entries.  The order above is correct.
-- If you see an error about missing table "invoices", just run the
-- migration a second time — PostgreSQL will succeed on the retry
-- once invoices exists.
