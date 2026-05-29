import sql from "@/app/api/utils/sql";
import {
  getUserId,
  requireFY,
  requireString,
  requirePositiveNumber,
  requireDate,
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
  "category",
  "description",
  "amount",
  "expense_date",
  "is_recurring",
  "recurring_frequency",
  "business_percentage",
  "receipt_url",
  "notes",
]);

// ---------------------------------------------------------------------------
// GET /api/expenses?fy=2024-25
// ---------------------------------------------------------------------------
export async function GET(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const fy = searchParams.get("fy");

    const fyCheck = requireFY(fy);
    if (!fyCheck.valid) return errorResponse(fyCheck.error, 400);

    const expenses = await sql`
      SELECT * FROM expenses
      WHERE user_id = ${userId} AND fy = ${fy}
      ORDER BY expense_date DESC
    `;

    return jsonResponse({ expenses });
  } catch (error) {
    return serverError("GET /api/expenses", error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/expenses
// ---------------------------------------------------------------------------
export async function POST(request) {
  try {
    const userId = getUserId(request);
    const { data: body, error: parseErr } = await parseJsonBody(request);
    if (parseErr) return parseErr;

    const {
      fy,
      category,
      description,
      amount,
      expense_date,
      is_recurring = false,
      recurring_frequency = null,
      business_percentage = 100,
      receipt_url = null,
      notes = null,
    } = body;

    // --- Validation ---------------------------------------------------------
    const fyCheck = requireFY(fy);
    if (!fyCheck.valid) return errorResponse(fyCheck.error, 400);

    for (const [val, name] of [
      [category, "category"],
      [description, "description"],
    ]) {
      const check = requireString(val, name);
      if (!check.valid) return errorResponse(check.error, 400);
    }

    const amountCheck = requirePositiveNumber(amount, "amount");
    if (!amountCheck.valid) return errorResponse(amountCheck.error, 400);

    const dateCheck = requireDate(expense_date, "expense_date");
    if (!dateCheck.valid) return errorResponse(dateCheck.error, 400);

    const bizPctCheck = requirePositiveNumber(business_percentage, "business_percentage", { max: 100 });
    if (!bizPctCheck.valid) return errorResponse(bizPctCheck.error, 400);

    // --- Insert -------------------------------------------------------------
    const [expense] = await sql`
      INSERT INTO expenses (
        user_id, fy, category, description, amount, expense_date,
        is_recurring, recurring_frequency, business_percentage,
        receipt_url, notes
      ) VALUES (
        ${userId}, ${fy}, ${category}, ${description}, ${amountCheck.parsed},
        ${expense_date}, ${!!is_recurring}, ${recurring_frequency},
        ${bizPctCheck.parsed}, ${receipt_url}, ${notes}
      )
      RETURNING *
    `;

    return jsonResponse({ expense }, 201);
  } catch (error) {
    return serverError("POST /api/expenses", error);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/expenses  { id, ...fields }
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
    const safeUpdates = filterToAllowedFields(rawUpdates, ALLOWED_UPDATE_FIELDS);

    // Validate amount if present
    if (safeUpdates.amount !== undefined) {
      const check = requirePositiveNumber(safeUpdates.amount, "amount");
      if (!check.valid) return errorResponse(check.error, 400);
      safeUpdates.amount = check.parsed;
    }

    // Validate business_percentage if present
    if (safeUpdates.business_percentage !== undefined) {
      const check = requirePositiveNumber(safeUpdates.business_percentage, "business_percentage", { max: 100 });
      if (!check.valid) return errorResponse(check.error, 400);
      safeUpdates.business_percentage = check.parsed;
    }

    // Validate expense_date if present
    if (safeUpdates.expense_date !== undefined) {
      const check = requireDate(safeUpdates.expense_date, "expense_date");
      if (!check.valid) return errorResponse(check.error, 400);
    }

    const fields = Object.keys(safeUpdates);
    if (!fields.length) {
      return errorResponse("No valid fields to update", 400);
    }

    const { query, params } = buildUpdateQuery("expenses", safeUpdates, userId, id);
    const result = await sql(query, params);

    if (!result.length) {
      return errorResponse("Expense not found", 404);
    }

    return jsonResponse({ expense: result[0] });
  } catch (error) {
    return serverError("PUT /api/expenses", error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/expenses?id=<uuid>
// ---------------------------------------------------------------------------
export async function DELETE(request) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const idCheck = requireId(id);
    if (!idCheck.valid) return errorResponse(idCheck.error, 400);

    const result = await sql`
      DELETE FROM expenses WHERE id = ${id} AND user_id = ${userId} RETURNING id
    `;

    if (!result.length) {
      return errorResponse("Expense not found or already deleted", 404);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return serverError("DELETE /api/expenses", error);
  }
}
