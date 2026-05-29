import sql from "@/app/api/utils/sql";
import {
  getUserId,
  requireFY,
  requireString,
  requirePositiveNumber,
  requireDate,
  requireId,
  errorResponse,
  jsonResponse,
  serverError,
  parseJsonBody,
} from "@/app/api/utils/helpers";

// ---------------------------------------------------------------------------
// GET /api/tds?fy=2024-25
// ---------------------------------------------------------------------------
export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");

    const fyCheck = requireFY(fy);
    if (!fyCheck.valid) return errorResponse(fyCheck.error, 400);

    const entries = await sql`
      SELECT * FROM tds_entries
      WHERE user_id = ${userId} AND fy = ${fy}
      ORDER BY tds_date DESC
    `;

    return jsonResponse({ entries });
  } catch (error) {
    return serverError("GET /api/tds", error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/tds
// ---------------------------------------------------------------------------
export async function POST(request) {
  try {
    const userId = getUserId(request);
    const { data: body, error: parseErr } = await parseJsonBody(request);
    if (parseErr) return parseErr;

    const {
      fy,
      deductor_name,
      deductor_tan = null,
      amount_credited,
      tds_deducted,
      tds_date,
      form_26as_verified = false,
      notes = null,
    } = body;

    // --- Validation ---------------------------------------------------------
    const fyCheck = requireFY(fy);
    if (!fyCheck.valid) return errorResponse(fyCheck.error, 400);

    const nameCheck = requireString(deductor_name, "deductor_name");
    if (!nameCheck.valid) return errorResponse(nameCheck.error, 400);

    const creditedCheck = requirePositiveNumber(amount_credited, "amount_credited");
    if (!creditedCheck.valid) return errorResponse(creditedCheck.error, 400);

    const tdsCheck = requirePositiveNumber(tds_deducted, "tds_deducted");
    if (!tdsCheck.valid) return errorResponse(tdsCheck.error, 400);

    const dateCheck = requireDate(tds_date, "tds_date");
    if (!dateCheck.valid) return errorResponse(dateCheck.error, 400);

    // Sanity: TDS deducted should not exceed amount credited
    if (tdsCheck.parsed > creditedCheck.parsed) {
      return errorResponse("tds_deducted cannot exceed amount_credited", 400);
    }

    // --- Insert -------------------------------------------------------------
    const [entry] = await sql`
      INSERT INTO tds_entries (
        user_id, fy, deductor_name, deductor_tan,
        amount_credited, tds_deducted, tds_date,
        form_26as_verified, notes
      ) VALUES (
        ${userId}, ${fy}, ${deductor_name}, ${deductor_tan},
        ${creditedCheck.parsed}, ${tdsCheck.parsed}, ${tds_date},
        ${!!form_26as_verified}, ${notes}
      )
      RETURNING *
    `;

    return jsonResponse({ entry }, 201);
  } catch (error) {
    return serverError("POST /api/tds", error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/tds?id=<uuid>
// ---------------------------------------------------------------------------
export async function DELETE(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const idCheck = requireId(id);
    if (!idCheck.valid) return errorResponse(idCheck.error, 400);

    const result = await sql`
      DELETE FROM tds_entries WHERE id = ${id} AND user_id = ${userId} RETURNING id
    `;

    if (!result.length) {
      return errorResponse("TDS entry not found or already deleted", 404);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return serverError("DELETE /api/tds", error);
  }
}
