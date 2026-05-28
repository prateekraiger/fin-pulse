import sql from "@/app/api/utils/sql";

function getUserId(req) {
  return req.headers.get("x-user-id") || "demo-user";
}

export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");
    if (!fy)
      return Response.json({ error: "FY parameter required" }, { status: 400 });

    const [[gstRow], [incomeRow], [invoiceRow], [gstInvoicesRow]] =
      await Promise.all([
        sql`SELECT * FROM gst_settings WHERE user_id = ${userId}`,
        sql`SELECT COALESCE(SUM(inr_amount), 0) as total FROM income_entries WHERE user_id = ${userId} AND fy = ${fy}`,
        sql`SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE user_id = ${userId} AND fy = ${fy}`,
        sql`SELECT COUNT(*)::int as count FROM invoices WHERE user_id = ${userId} AND fy = ${fy} AND gst_applied = true`,
      ]);

    const threshold = gstRow ? parseFloat(gstRow.threshold_limit) : 2000000;
    const turnover = Math.max(
      parseFloat(incomeRow?.total || 0),
      parseFloat(invoiceRow?.total || 0),
    );
    const percentage =
      threshold > 0 ? Math.min((turnover / threshold) * 100, 100) : 0;

    const alert_status =
      percentage >= 100
        ? "exceeded"
        : percentage >= 85
          ? "critical"
          : percentage >= 70
            ? "warning"
            : "safe";

    return Response.json({
      settings: gstRow || { gst_registered: false, threshold_limit: threshold },
      turnover,
      threshold,
      percentage,
      gst_invoices_count: gstInvoicesRow?.count || 0,
      alert_status,
    });
  } catch (error) {
    console.error("GET /api/gst/status:", error);
    return Response.json(
      { error: "Failed to fetch GST status" },
      { status: 500 },
    );
  }
}
