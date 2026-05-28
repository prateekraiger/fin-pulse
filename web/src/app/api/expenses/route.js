import sql from "@/app/api/utils/sql";

function getUserId(req) {
  return req.headers.get("x-user-id") || "demo-user";
}

// List expenses
export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");
    if (!fy)
      return Response.json({ error: "fy parameter required" }, { status: 400 });
    const expenses =
      await sql`SELECT * FROM expenses WHERE user_id = ${userId} AND fy = ${fy} ORDER BY expense_date DESC`;
    return Response.json({ expenses });
  } catch (error) {
    console.error("GET /api/expenses:", error);
    return Response.json(
      { error: "Failed to fetch expenses" },
      { status: 500 },
    );
  }
}

// Create expense
export async function POST(request) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const {
      fy,
      category,
      description,
      amount,
      expense_date,
      is_recurring = false,
      recurring_frequency,
      business_percentage = 100,
      receipt_url,
      notes,
    } = body;
    if (!fy || !category || !description || !amount || !expense_date)
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    const [expense] = await sql`
      INSERT INTO expenses (user_id, fy, category, description, amount, expense_date, is_recurring, recurring_frequency, business_percentage, receipt_url, notes)
      VALUES (${userId}, ${fy}, ${category}, ${description}, ${amount}, ${expense_date}, ${is_recurring}, ${recurring_frequency || null}, ${business_percentage}, ${receipt_url || null}, ${notes || null})
      RETURNING *
    `;
    return Response.json({ expense });
  } catch (error) {
    console.error("POST /api/expenses:", error);
    return Response.json(
      { error: "Failed to create expense" },
      { status: 500 },
    );
  }
}

// Update expense
export async function PUT(request) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return Response.json({ error: "ID required" }, { status: 400 });
    const fields = Object.keys(updates);
    if (!fields.length)
      return Response.json({ error: "No fields to update" }, { status: 400 });
    const setClauses = fields.map((k, i) => `${k} = $${i + 3}`).join(", ");
    const result = await sql(
      `UPDATE expenses SET ${setClauses}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...fields.map((k) => updates[k])],
    );
    if (!result.length)
      return Response.json({ error: "Expense not found" }, { status: 404 });
    return Response.json({ expense: result[0] });
  } catch (error) {
    console.error("PUT /api/expenses:", error);
    return Response.json(
      { error: "Failed to update expense" },
      { status: 500 },
    );
  }
}

// Delete expense
export async function DELETE(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "ID required" }, { status: 400 });
    await sql`DELETE FROM expenses WHERE id = ${id} AND user_id = ${userId}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/expenses:", error);
    return Response.json(
      { error: "Failed to delete expense" },
      { status: 500 },
    );
  }
}
