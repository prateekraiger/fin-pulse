import sql from "@/app/api/utils/sql";

function getUserId(request) {
  return request.headers.get("x-user-id") || "demo-user";
}

export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");

    if (!fy)
      return Response.json({ error: "fy parameter required" }, { status: 400 });

    const entries = await sql`
      SELECT * FROM tds_entries
      WHERE user_id = ${userId} AND fy = ${fy}
      ORDER BY tds_date DESC
    `;

    return Response.json({ entries });
  } catch (error) {
    console.error("GET /api/tds:", error);
    return Response.json(
      { error: "Failed to fetch TDS entries" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const userId = getUserId(request);
    const body = await request.json();

    const {
      fy,
      deductor_name,
      deductor_tan,
      amount_credited,
      tds_deducted,
      tds_date,
      form_26as_verified = false,
      notes,
    } = body;

    if (
      !fy ||
      !deductor_name ||
      !amount_credited ||
      !tds_deducted ||
      !tds_date
    ) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const [entry] = await sql`
      INSERT INTO tds_entries (
        user_id, fy, deductor_name, deductor_tan,
        amount_credited, tds_deducted, tds_date,
        form_26as_verified, notes
      ) VALUES (
        ${userId}, ${fy}, ${deductor_name}, ${deductor_tan || null},
        ${amount_credited}, ${tds_deducted}, ${tds_date},
        ${form_26as_verified}, ${notes || null}
      )
      RETURNING *
    `;

    return Response.json({ entry });
  } catch (error) {
    console.error("POST /api/tds:", error);
    return Response.json(
      { error: "Failed to create TDS entry" },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return Response.json({ error: "id required" }, { status: 400 });

    await sql`DELETE FROM tds_entries WHERE id = ${id} AND user_id = ${userId}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tds:", error);
    return Response.json(
      { error: "Failed to delete TDS entry" },
      { status: 500 },
    );
  }
}
