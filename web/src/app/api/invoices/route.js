import sql from "@/app/api/utils/sql";

function getUserId(req) {
  return req.headers.get("x-user-id") || "demo-user";
}

// Whitelist of allowed columns to prevent SQL injection via dynamic column names
const ALLOWED_UPDATE_FIELDS = new Set([
  "invoice_number",
  "client_name",
  "description",
  "amount",
  "gst_applied",
  "gst_amount",
  "total_amount",
  "invoice_date",
  "due_date",
  "payment_status",
  "payment_date",
  "notes",
]);

// List invoices
export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");
    if (!fy)
      return Response.json({ error: "fy parameter required" }, { status: 400 });
    const invoices =
      await sql`SELECT * FROM invoices WHERE user_id = ${userId} AND fy = ${fy} ORDER BY invoice_date DESC`;
    return Response.json({ invoices });
  } catch (error) {
    console.error("GET /api/invoices:", error);
    return Response.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}

// Create invoice
export async function POST(request) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const {
      fy,
      invoice_number,
      client_name,
      description,
      amount,
      gst_applied = false,
      invoice_date,
      due_date,
      payment_status = "unpaid",
      notes,
    } = body;
    if (!fy || !client_name || !amount || !invoice_date)
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0)
      return Response.json({ error: "Invalid amount" }, { status: 400 });

    const gst_amount = gst_applied ? parsedAmount * 0.18 : 0;
    const total_amount = parsedAmount + gst_amount;
    const [invoice] = await sql`
      INSERT INTO invoices (user_id, fy, invoice_number, client_name, description, amount, gst_applied, gst_amount, total_amount, invoice_date, due_date, payment_status, notes)
      VALUES (${userId}, ${fy}, ${invoice_number || null}, ${client_name}, ${description || null}, ${parsedAmount}, ${gst_applied}, ${gst_amount}, ${total_amount}, ${invoice_date}, ${due_date || null}, ${payment_status}, ${notes || null})
      RETURNING *
    `;
    return Response.json({ invoice });
  } catch (error) {
    console.error("POST /api/invoices:", error);
    return Response.json(
      { error: "Failed to create invoice" },
      { status: 500 },
    );
  }
}

// Validates a column name is safe for SQL interpolation (defense-in-depth)
function isSafeColumnName(name) {
  return /^[a-z_][a-z0-9_]*$/.test(name);
}

// Update invoice -- uses whitelist + regex validation to prevent SQL injection
export async function PUT(request) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const { id, ...rawUpdates } = body;
    if (!id) return Response.json({ error: "ID required" }, { status: 400 });

    // Filter to only allowed fields AND validate column name format
    const updates = {};
    for (const [key, value] of Object.entries(rawUpdates)) {
      if (ALLOWED_UPDATE_FIELDS.has(key) && isSafeColumnName(key)) {
        updates[key] = value;
      }
    }

    if (updates.amount !== undefined || updates.gst_applied !== undefined) {
      const [current] =
        await sql`SELECT amount, gst_applied FROM invoices WHERE id = ${id} AND user_id = ${userId}`;
      if (!current)
        return Response.json({ error: "Invoice not found" }, { status: 404 });
      const amount = parseFloat(updates.amount ?? current.amount);
      const gst_applied = updates.gst_applied ?? current.gst_applied;
      updates.gst_amount = gst_applied ? amount * 0.18 : 0;
      updates.total_amount = amount + updates.gst_amount;
    }

    if (updates.payment_status === "paid" && !updates.payment_date) {
      updates.payment_date = new Date().toISOString().split("T")[0];
    }

    const fields = Object.keys(updates);
    if (!fields.length)
      return Response.json({ error: "No valid fields to update" }, { status: 400 });

    // Build parameterized query — column names are from the validated whitelist only
    const setClauses = fields.map((k, i) => `"${k}" = $${i + 3}`).join(", ");
    const result = await sql(
      `UPDATE invoices SET ${setClauses}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...fields.map((k) => updates[k])],
    );
    if (!result.length)
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    return Response.json({ invoice: result[0] });
  } catch (error) {
    console.error("PUT /api/invoices:", error);
    return Response.json(
      { error: "Failed to update invoice" },
      { status: 500 },
    );
  }
}

// Delete invoice
export async function DELETE(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "ID required" }, { status: 400 });
    await sql`DELETE FROM invoices WHERE id = ${id} AND user_id = ${userId}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/invoices:", error);
    return Response.json(
      { error: "Failed to delete invoice" },
      { status: 500 },
    );
  }
}
