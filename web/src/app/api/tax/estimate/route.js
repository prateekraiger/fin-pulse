import sql from '@/app/api/utils/sql';
import {
  withMiddleware,
  getUserId,
  ApiError,
  jsonResponse,
} from '@/app/api/utils/middleware';

// ── Tax calculation ────────────────────────────────────────────────────────

/**
 * Compute income tax under the New Tax Regime (FY 2024-25 / 2025-26 slabs).
 *
 * Slabs (AY 2025-26):
 *   ₹0       – ₹3,00,000   → 0%
 *   ₹3,00,001 – ₹7,00,000  → 5%
 *   ₹7,00,001 – ₹10,00,000 → 10%
 *   ₹10,00,001 – ₹12,00,000 → 15%
 *   ₹12,00,001 – ₹15,00,000 → 20%
 *   Above ₹15,00,000         → 30%
 *
 * + Section 87A rebate (income ≤ ₹7L → tax = 0)
 * + 4% Health & Education cess on tax
 *
 * @param {number} income  Taxable income in INR
 * @returns {number}       Total tax including cess, rounded to nearest rupee
 */
function calcTax(income) {
  if (income <= 0) return 0;

  let tax = 0;

  if (income <= 300_000) {
    tax = 0;
  } else if (income <= 700_000) {
    tax = (income - 300_000) * 0.05;
  } else if (income <= 1_000_000) {
    tax = 20_000 + (income - 700_000) * 0.10;
  } else if (income <= 1_200_000) {
    tax = 50_000 + (income - 1_000_000) * 0.15;
  } else if (income <= 1_500_000) {
    tax = 80_000 + (income - 1_200_000) * 0.20;
  } else {
    tax = 140_000 + (income - 1_500_000) * 0.30;
  }

  // Section 87A rebate: full rebate if income ≤ ₹7L (net tax = 0)
  if (income <= 700_000) {
    tax = 0;
  }

  // 4% Health & Education cess
  return Math.round(tax * 1.04);
}

/**
 * Section 44ADA limit based on whether the majority of receipts are digital.
 * FY 2024-25 onwards: ₹75L for digital, ₹50L otherwise.
 */
function getLimit44ADA(digitalMajority) {
  return digitalMajority ? 7_500_000 : 5_000_000;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function parseFY(fy) {
  if (!fy || typeof fy !== 'string') return null;
  const [aStr, bStr] = fy.split('-');
  const a = parseInt(aStr, 10);
  const b = parseInt(bStr, 10);
  if (isNaN(a) || isNaN(b)) return null;
  if (b !== a + 1) return null;
  if (a < 2000 || a > 2100) return null;
  return { start: a, end: b };
}

// ── GET /api/tax/estimate ──────────────────────────────────────────────────
async function getTaxEstimate(request) {
  const userId = getUserId(request);
  const { searchParams } = new URL(request.url);
  const fy = searchParams.get('fy');

  const fyParsed = parseFY(fy);
  if (!fyParsed) {
    throw new ApiError('Valid FY parameter is required (e.g. 2025-2026)', 400, 'INVALID_FY');
  }

  // Load profile first — required for 44ADA eligibility
  const [profile] = await sql`
    SELECT *
    FROM user_profiles
    WHERE user_id = ${userId}
  `;

  if (!profile) {
    throw new ApiError(
      'Profile not found. Please complete onboarding first.',
      404,
      'PROFILE_NOT_FOUND'
    );
  }

  // Load income, expenses, and TDS in parallel
  const [[incomeRow], [expenseRow], [tdsRow]] = await Promise.all([
    sql`
      SELECT COALESCE(SUM(inr_amount), 0)::numeric AS total
      FROM income_entries
      WHERE user_id = ${userId}
        AND fy = ${fy}
    `,
    sql`
      SELECT COALESCE(SUM(amount * business_percentage / 100.0), 0)::numeric AS total
      FROM expenses
      WHERE user_id = ${userId}
        AND fy = ${fy}
    `,
    sql`
      SELECT COALESCE(SUM(tds_deducted), 0)::numeric AS total
      FROM tds_entries
      WHERE user_id = ${userId}
        AND fy = ${fy}
    `,
  ]);

  const grossReceipts  = parseFloat(incomeRow?.total  ?? 0);
  const totalExpenses  = parseFloat(expenseRow?.total ?? 0);
  const tdsDeducted    = parseFloat(tdsRow?.total     ?? 0);

  const actualIncome      = Math.max(0, grossReceipts - totalExpenses);
  const presumptiveIncome = grossReceipts * 0.5; // 50% of gross receipts

  const limit44ADA   = getLimit44ADA(profile.digital_receipts_majority);
  const eligible44ADA = grossReceipts <= limit44ADA;

  const taxOnActual       = calcTax(actualIncome);
  const taxOnPresumptive  = calcTax(presumptiveIncome);
  const netTaxActual      = Math.max(0, taxOnActual - tdsDeducted);
  const netTaxPresumptive = Math.max(0, taxOnPresumptive - tdsDeducted);

  const { start: fyYear, end: nextFyYear } = fyParsed;

  const advanceTaxSchedule = [
    { date: `${fyYear}-06-15`,     percentage: 15,  label: 'Q1 — Jun 15' },
    { date: `${fyYear}-09-15`,     percentage: 45,  label: 'Q2 — Sep 15' },
    { date: `${fyYear}-12-15`,     percentage: 75,  label: 'Q3 — Dec 15' },
    { date: `${nextFyYear}-03-15`, percentage: 100, label: 'Q4 — Mar 15' },
  ].map((item) => ({
    ...item,
    amount_actual:       Math.round((netTaxActual      * item.percentage) / 100),
    amount_presumptive:  Math.round((netTaxPresumptive * item.percentage) / 100),
  }));

  const recommendedRoute =
    eligible44ADA && taxOnPresumptive < taxOnActual
      ? 'presumptive'
      : 'actual';

  return jsonResponse({
    gross_receipts:        grossReceipts,
    total_expenses:        totalExpenses,
    actual_income:         actualIncome,
    presumptive_income:    presumptiveIncome,
    eligible_44ada:        eligible44ADA,
    limit_44ada:           limit44ADA,
    tax_on_actual:         taxOnActual,
    tax_on_presumptive:    taxOnPresumptive,
    tds_deducted:          tdsDeducted,
    net_tax_actual:        netTaxActual,
    net_tax_presumptive:   netTaxPresumptive,
    recommended_route:     recommendedRoute,
    advance_tax_schedule:  advanceTaxSchedule,
  });
}

// ── Exports ────────────────────────────────────────────────────────────────
export const GET = withMiddleware(getTaxEstimate, { routeName: 'GET /api/tax/estimate' });
