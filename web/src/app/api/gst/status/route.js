import sql from "@/app/api/utils/sql";
import {
  getUserId,
  requireFY,
  errorResponse,
  jsonResponse,
  serverError,
} from "@/app/api/utils/helpers";

// ---------------------------------------------------------------------------
// GET /api/gst/status?fy=2024-25
// ---------------------------------------------------------------------------
export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");

    const fyCheck = requireFY(fy);
    if (!fyCheck.valid) return errorResponse(fyCheck.error, 400);

    // --- Parallel data fetch ------------------------------------------------
    const [gstRows, incomeRows, invoiceRows, gstInvoicesRows] =
      await Promise.all([
        sql`SELECT * FROM gst_settings WHERE user_id = ${userId}`,
        sql`SELECT COALESCE(SUM(inr_amount), 0) AS total
            FROM income_entries WHERE user_id = ${userId} AND fy = ${fy}`,
        sql`SELECT COALESCE(SUM(amount), 0) AS total
            FROM invoices WHERE user_id = ${userId} AND fy = ${fy}`,
        sql`SELECT COUNT(*)::int AS count
            FROM invoices WHERE user_id = ${userId} AND fy = ${fy} AND gst_applied = true`,
      ]);

    const gstRow = gstRows[0];
    const threshold = gstRow ? parseFloat(gstRow.threshold_limit) : 2_000_000;

    const turnover = Math.max(
      parseFloat(incomeRows[0]?.total ?? 0),
      parseFloat(invoiceRows[0]?.total ?? 0)
    );

    const percentage =
      threshold > 0 ? Math.min((turnover / threshold) * 100, 100) : 0;

    // Alert bands
    let alert_status;
    if (percentage >= 100) {
      alert_status = "exceeded";
    } else if (percentage >= 85) {
      alert_status = "critical";
    } else if (percentage >= 70) {
      alert_status = "warning";
    } else {
      alert_status = "safe";
    }

    return jsonResponse({
      settings: gstRow ?? { gst_registered: false, threshold_limit: threshold },
      turnover,
      threshold,
      percentage,
      gst_invoices_count: gstInvoicesRows[0]?.count ?? 0,
      alert_status,
    });
  } catch (error) {
    return serverError("GET /api/gst/status", error);
  }
}
