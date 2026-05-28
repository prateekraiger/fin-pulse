import sql from "@/app/api/utils/sql";

function getUserId(req) {
  return req.headers.get("x-user-id") || "demo-user";
}

// FY 2024-25 new regime slabs + 87A rebate + 4% cess
function calcTax(income) {
  if (income <= 0) return 0;
  let tax = 0;
  if (income <= 300000) {
    tax = 0;
  } else if (income <= 700000) {
    tax = (income - 300000) * 0.05;
  } else if (income <= 1000000) {
    tax = 20000 + (income - 700000) * 0.1;
  } else if (income <= 1200000) {
    tax = 50000 + (income - 1000000) * 0.15;
  } else if (income <= 1500000) {
    tax = 80000 + (income - 1200000) * 0.2;
  } else {
    tax = 140000 + (income - 1500000) * 0.3;
  }
  if (income <= 700000) tax = 0; // Rebate u/s 87A under new regime
  return Math.round(tax * 1.04); // 4% cess
}

export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");
    if (!fy)
      return Response.json({ error: "FY parameter required" }, { status: 400 });

    const [profile] =
      await sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`;
    if (!profile)
      return Response.json(
        { error: "Profile not found. Complete onboarding first." },
        { status: 404 },
      );

    const [[incomeRow], [expenseRow], [tdsRow]] = await Promise.all([
      sql`SELECT COALESCE(SUM(inr_amount), 0) as total FROM income_entries WHERE user_id = ${userId} AND fy = ${fy}`,
      sql`SELECT COALESCE(SUM(amount * business_percentage / 100.0), 0) as total FROM expenses WHERE user_id = ${userId} AND fy = ${fy}`,
      sql`SELECT COALESCE(SUM(tds_deducted), 0) as total FROM tds_entries WHERE user_id = ${userId} AND fy = ${fy}`,
    ]);

    const grossReceipts = parseFloat(incomeRow.total || 0);
    const totalExpenses = parseFloat(expenseRow.total || 0);
    const tdsDeducted = parseFloat(tdsRow.total || 0);
    const actualIncome = Math.max(0, grossReceipts - totalExpenses);
    const presumptiveIncome = grossReceipts * 0.5;

    // 44ADA: ₹75L limit if majority digital, ₹50L otherwise
    const limit_44ada = profile.digital_receipts_majority ? 7500000 : 5000000;
    const eligible44ADA = grossReceipts <= limit_44ada;

    const taxOnActual = calcTax(actualIncome);
    const taxOnPresumptive = calcTax(presumptiveIncome);
    const netTaxActual = Math.max(0, taxOnActual - tdsDeducted);
    const netTaxPresumptive = Math.max(0, taxOnPresumptive - tdsDeducted);

    const fyYear = parseInt(fy.split("-")[0]);
    const nextFyYear = parseInt(fy.split("-")[1]) || fyYear + 1;
    const advanceTaxDueDates = [
      { date: `${fyYear}-06-15`, percentage: 15 },
      { date: `${fyYear}-09-15`, percentage: 45 },
      { date: `${fyYear}-12-15`, percentage: 75 },
      { date: `${nextFyYear}-03-15`, percentage: 100 },
    ];

    return Response.json({
      gross_receipts: grossReceipts,
      total_expenses: totalExpenses,
      actual_income: actualIncome,
      presumptive_income: presumptiveIncome,
      eligible_44ada: eligible44ADA,
      limit_44ada,
      tax_on_actual: taxOnActual,
      tax_on_presumptive: taxOnPresumptive,
      tds_deducted: tdsDeducted,
      net_tax_actual: netTaxActual,
      net_tax_presumptive: netTaxPresumptive,
      recommended_route:
        eligible44ADA && taxOnPresumptive < taxOnActual
          ? "presumptive"
          : "actual",
      advance_tax_schedule: advanceTaxDueDates.map((item) => ({
        ...item,
        amount_actual: Math.round((netTaxActual * item.percentage) / 100),
        amount_presumptive: Math.round(
          (netTaxPresumptive * item.percentage) / 100,
        ),
      })),
    });
  } catch (error) {
    console.error("GET /api/tax/estimate:", error);
    return Response.json(
      { error: "Failed to calculate tax estimate" },
      { status: 500 },
    );
  }
}
