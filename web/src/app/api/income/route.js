import sql from "@/app/api/utils/sql";
import {
  getUserId,
  requireFY,
  requireString,
  requirePositiveNumber,
  requireId,
  filterToAllowedFields,
  buildUpdateQuery,
  errorResponse,
  jsonResponse,
  serverError,
  parseJsonBody,
} from "@/app/api/utils/helpers";

// Whitelist of columns that may be updated via PUT
const ALLOWED_UPDATE_FIELDS = new Set([
  "source_type",
  "client_name",
  "description",
  "amount",
  "currency",
  "exchange_rate",
  "inr_amount",
  "payment_status",
  "settlement_date",
  "invoice_id",
]);

// ---------------------------------------------------------------------------
// GET /api/income?fy=2024-25
// ---------------------------------------------------------------------------
export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");

    const fyCheck = requireFY(fy);
    if (!fyCheck.valid) return errorResponse(fyCheck.error, 400);

    const entries = await sql`
      SELECT * FROM income_entries
      WHERE user_id = ${userId} AND fy = ${fy}
      ORDER BY settlement_date DESC NULLS LAST, created_at DESC
    `;

    return jsonResponse({ entries });
  } catch (error) {
    return serverError("GET /api/income", error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/income
// ---------------------------------------------------------------------------
export async function POST(request) {
  try {
    const userId = getUserId(request);
    const { data: body, error: parseErr } = await parseJsonBody(request);
    if (parseErr) return parseErr;

    const {
      fy,
      source_type,
      client_name,
      description = null,
      amount,
      currency = "INR",
      exchange_rate = 1,
      payment_status,
      settlement_date = null,
      invoice_id = null,
    } = body;

    // --- Validation ---------------------------------------------------------
    const fyCheck = requireFY(fy);
    if (!fyCheck.valid) return errorResponse(fyCheck.error, 400);

    for (const [val, name] of [
      [source_type, "source_type"],
      [client_name, "client_name"],
      [payment_status, "payment_status"],
    ]) {
      const check = requireString(val, name);
      if (!check.valid) return errorResponse(check.error, 400);
    }

    const amountCheck = requirePositiveNumber(amount, "amount");
    if (!amountCheck.valid) return errorResponse(amountCheck.error, 400);

    const rateCheck = requirePositiveNumber(exchange_rate, "exchange_rate", { allowZero: false });
    if (!rateCheck.valid) return errorResponse(rateCheck.error, 400);

    const inr_amount = amountCheck.parsed * rateCheck.parsed;

    // --- Insert -------------------------------------------------------------
    const [entry] = await sql`
      INSERT INTO income_entries (
        user_id, fy, source_type, client_name, description,
        amount, currency, exchange_rate, inr_amount,
        payment_status, settlement_date, invoice_id
      ) VALUES (
        ${userId}, ${fy}, ${source_type}, ${client_name}, ${description},
        ${amountCheck.parsed}, ${currency}, ${rateCheck.parsed}, ${inr_amount},
        ${payment_status}, ${settlement_date}, ${invoice_id}
      )
      RETURNING *
    `;

    return jsonResponse({ entry }, 201);
  } catch (error) {
    return serverError("POST /api/income", error);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/income  { id, ...fields }
// ---------------------------------------------------------------------------
export async function PUT(request) {
  try {
    const userId = getUserId(request);
    const { data: body, error: parseErr } = await parseJsonBody(request);
    if (parseErr) return parseErr;

    const { id, ...rawUpdates } = body;

    const idCheck = requireId(id);
    if (!idCheck.valid) return errorResponse(idCheck.error, 400);

    // Filter to safe, allowed fields
    const updates = filterToAllowedFields(rawUpdates, ALLOWED_UPDATE_FIELDS);

    // Validate amount if present
    if (updates.amount !== undefined) {
      const check = requirePositiveNumber(updates.amount, "amount");
      if (!check.valid) return errorResponse(check.error, 400);
      updates.amount = check.parsed;
    }

    // Validate exchange_rate if present
    if (updates.exchange_rate !== undefined) {
      const check = requirePositiveNumber(updates.exchange_rate, "exchange_rate", { allowZero: false });
      if (!check.valid) return errorResponse(check.error, 400);
      updates.exchange_rate = check.parsed;
    }

    // Re-compute inr_amount when amount or exchange_rate changes
    if (updates.amount !== undefined || updates.exchange_rate !== undefined) {
      const [current] = await sql`
        SELECT amount, exchange_rate FROM income_entries
        WHERE id = ${id} AND user_id = ${userId}
      `;
      if (!current) return errorResponse("Entry not found", 404);

      const finalAmount = updates.amount ?? parseFloat(current.amount);
      const finalRate = updates.exchange_rate ?? parseFloat(current.exchange_rate);
      updates.inr_amount = finalAmount * finalRate;
    }

    const fields = Object.keys(updates);
    if (!fields.length) {
      return errorResponse("No valid fields to update", 400);
    }

    const { query, params } = buildUpdateQuery("income_entries", updates, userId, id);
    const result = await sql(query, params);

    if (!result.length) {
      return errorResponse("Entry not found", 404);
    }

    return jsonResponse({ entry: result[0] });
  } catch (error) {
    return serverError("PUT /api/income", error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/income?id=<uuid>
// ---------------------------------------------------------------------------
export async function DELETE(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const idCheck = requireId(id);
    if (!idCheck.valid) return errorResponse(idCheck.error, 400);

    const result = await sql`
      DELETE FROM income_entries WHERE id = ${id} AND user_id = ${userId} RETURNING id
    `;

    if (!result.length) {
      return errorResponse("Entry not found or already deleted", 404);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return serverError("DELETE /api/income", error);
  }
}
