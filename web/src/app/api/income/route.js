import sql from "@/app/api/utils/sql";

function getUserId(req) {
  return req.headers.get("x-user-id") || "demo-user";
}

// List income entries
export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");
    if (!fy)
      return Response.json({ error: "fy parameter required" }, { status: 400 });
    const entries =
      await sql`SELECT * FROM income_entries WHERE user_id = ${userId} AND fy = ${fy} ORDER BY settlement_date DESC NULLS LAST, created_at DESC`;
    return Response.json({ entries });
  } catch (error) {
    console.error("GET /api/income:", error);
    return Response.json(
      { error: "Failed to fetch income entries" },
      { status: 500 },
    );
  }
}

// Create income entry
export async function POST(request) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const {
      fy,
      source_type,
      client_name,
      description,
      amount,
      currency = "INR",
      exchange_rate = 1,
      payment_status,
      settlement_date,
      invoice_id,
    } = body;
    if (!fy || !source_type || !client_name || !amount || !payment_status)
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    const inr_amount = parseFloat(amount) * parseFloat(exchange_rate);
    const [entry] = await sql`
      INSERT INTO income_entries (user_id, fy, source_type, client_name, description, amount, currency, exchange_rate, inr_amount, payment_status, settlement_date, invoice_id)
      VALUES (${userId}, ${fy}, ${source_type}, ${client_name}, ${description || null}, ${amount}, ${currency}, ${exchange_rate}, ${inr_amount}, ${payment_status}, ${settlement_date || null}, ${invoice_id || null})
      RETURNING *
    `;
    return Response.json({ entry });
  } catch (error) {
    console.error("POST /api/income:", error);
    return Response.json(
      { error: "Failed to create income entry" },
      { status: 500 },
    );
  }
}

// Update income entry
export async function PUT(request) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return Response.json({ error: "ID required" }, { status: 400 });

    if (updates.amount !== undefined || updates.exchange_rate !== undefined) {
      const [current] =
        await sql`SELECT amount, exchange_rate FROM income_entries WHERE id = ${id} AND user_id = ${userId}`;
      if (!current)
        return Response.json({ error: "Entry not found" }, { status: 404 });
      const amount = updates.amount ?? current.amount;
      const exchange_rate = updates.exchange_rate ?? current.exchange_rate;
      updates.inr_amount = parseFloat(amount) * parseFloat(exchange_rate);
    }

    const fields = Object.keys(updates);
    if (!fields.length)
      return Response.json({ error: "No fields to update" }, { status: 400 });
    const setClauses = fields.map((k, i) => `${k} = $${i + 3}`).join(", ");
    const result = await sql(
      `UPDATE income_entries SET ${setClauses}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...fields.map((k) => updates[k])],
    );
    if (!result.length)
      return Response.json({ error: "Entry not found" }, { status: 404 });
    return Response.json({ entry: result[0] });
  } catch (error) {
    console.error("PUT /api/income:", error);
    return Response.json(
      { error: "Failed to update income entry" },
      { status: 500 },
    );
  }
}

// Delete income entry
export async function DELETE(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "ID required" }, { status: 400 });
    await sql`DELETE FROM income_entries WHERE id = ${id} AND user_id = ${userId}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/income:", error);
    return Response.json(
      { error: "Failed to delete income entry" },
      { status: 500 },
    );
  }
}
