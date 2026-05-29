import sql from "@/app/api/utils/sql";
import {
  getUserId,
  requireFY,
  errorResponse,
  jsonResponse,
  serverError,
} from "@/app/api/utils/helpers";

/**
 * GET /api/dashboard?fy=2024-25
 *
 * Aggregated dashboard data for the given financial year:
 *  - total income / expenses / net income
 *  - invoice stats
 *  - GST threshold progress
 *  - upcoming compliance tasks
 *  - next advance-tax date
 */
export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");

    // --- Validate FY --------------------------------------------------------
    const fyCheck = requireFY(fy);
    if (!fyCheck.valid) return errorResponse(fyCheck.error, 400);

    // --- Parallel data fetch ------------------------------------------------
    const [incomeRows, expenseRows, invoiceRows, upcomingTasks, gstRows] =
      await Promise.all([
        sql`SELECT COALESCE(SUM(inr_amount), 0)::numeric AS total, COUNT(*)::int AS cnt
            FROM income_entries WHERE user_id = ${userId} AND fy = ${fy}`,
        sql`SELECT COALESCE(SUM(amount * business_percentage / 100.0), 0)::numeric AS total, COUNT(*)::int AS cnt
            FROM expenses WHERE user_id = ${userId} AND fy = ${fy}`,
        sql`SELECT COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE payment_status = 'unpaid')::int AS unpaid,
                   COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid
            FROM invoices WHERE user_id = ${userId} AND fy = ${fy}`,
        sql`SELECT * FROM compliance_tasks
            WHERE user_id = ${userId} AND completed = false
            ORDER BY due_date ASC LIMIT 5`,
        sql`SELECT threshold_limit FROM gst_settings WHERE user_id = ${userId}`,
      ]);

    const incomeRow = incomeRows[0];
    const expenseRow = expenseRows[0];
    const invoiceRow = invoiceRows[0];
    const gstRow = gstRows[0];

    const totalIncome = parseFloat(incomeRow?.total ?? 0);
    const totalExpenses = parseFloat(expenseRow?.total ?? 0);
    const netIncome = totalIncome - totalExpenses;
    const threshold = gstRow ? parseFloat(gstRow.threshold_limit) : 2000000;
    const gstProgress =
      threshold > 0 ? Math.min((totalIncome / threshold) * 100, 100) : 0;

    // --- Advance-tax date calculation ---------------------------------------
    const today = new Date();
    const parts = fy.split("-");
    const fyYear = parseInt(parts[0], 10);
    const nextFyYear = parseInt(parts[1], 10)
      ? 2000 + parseInt(parts[1], 10)
      : fyYear + 1;

    const advanceTaxDates = [
      new Date(`${fyYear}-06-15`),
      new Date(`${fyYear}-09-15`),
      new Date(`${fyYear}-12-15`),
      new Date(`${nextFyYear}-03-15`),
    ];
    const nextAdvanceTaxDate = advanceTaxDates.find((d) => d > today);

    return jsonResponse({
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_income: netIncome,
      income_count: incomeRow?.cnt ?? 0,
      expense_count: expenseRow?.cnt ?? 0,
      invoice_stats: {
        total: invoiceRow?.total ?? 0,
        unpaid: invoiceRow?.unpaid ?? 0,
        paid: invoiceRow?.paid ?? 0,
      },
      gst_progress: gstProgress,
      gst_threshold: threshold,
      upcoming_tasks: upcomingTasks ?? [],
      next_advance_tax_date: nextAdvanceTaxDate
        ? nextAdvanceTaxDate.toISOString().split("T")[0]
        : null,
    });
  } catch (error) {
    return serverError("GET /api/dashboard", error);
  }
}
