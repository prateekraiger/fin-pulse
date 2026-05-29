import sql from '@/app/api/utils/sql';
import {
  withMiddleware,
  getUserId,
  parseBody,
  requireFields,
  ApiError,
  jsonResponse,
} from '@/app/api/utils/middleware';

// ── Constants ──────────────────────────────────────────────────────────────

const ALLOWED_UPDATE_FIELDS = new Set([
  'invoice_number',
  'client_name',
  'description',
  'amount',
  'gst_applied',
  'gst_amount',
  'total_amount',
  'invoice_date',
  'due_date',
  'payment_status',
  'payment_date',
  'notes',
]);

const VALID_PAYMENT_STATUSES = new Set(['unpaid', 'paid', 'overdue', 'cancelled']);

// Standard GST rate for services in India
const GST_RATE = 0.18;

/** Allow only safe identifier characters (defense-in-depth). */
function isSafeColumnName(name) {
  return /^[a-z_][a-z0-9_]*$/.test(name);
}

function parseFY(fy) {
  if (!fy || typeof fy !== 'string') return false;
  const [a, b] = fy.split('-').map(Number);
  return !isNaN(a) && !isNaN(b) && b === a + 1 && a >= 2000 && a <= 2100;
}

function isValidDate(d) {
  if (!d || typeof d !== 'string') return false;
  return !isNaN(new Date(d).getTime());
}

/** Generate an invoice number like INV-2505-001 */
function genInvoiceNumber(count) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `INV-${yy}${mm}-${String(count + 1).padStart(3, '0')}`;
}

// ── GET /api/invoices ──────────────────────────────────────────────────────
async function listInvoices(request) {
  const userId = getUserId(request);
  const { searchParams } = new URL(request.url);
  const fy = searchParams.get('fy');

  if (!parseFY(fy)) {
    throw new ApiError('Valid fy parameter is required (e.g. 2025-2026)', 400, 'INVALID_FY');
  }

  const invoices = await sql`
    SELECT *
    FROM invoices
    WHERE user_id = ${userId}
      AND fy      = ${fy}
    ORDER BY invoice_date DESC
  `;

  return jsonResponse({ invoices });
}

// ── POST /api/invoices ─────────────────────────────────────────────────────
async function createInvoice(request) {
  const userId = getUserId(request);
  const body = await parseBody(request);

  requireFields(body, ['fy', 'client_name', 'amount', 'invoice_date']);

  const {
    fy,
    invoice_number,
    client_name,
    description,
    amount,
    gst_applied = false,
    invoice_date,
    due_date,
    payment_status = 'unpaid',
    notes,
  } = body;

  if (!parseFY(fy)) {
    throw new ApiError('Invalid financial year format', 400, 'INVALID_FY');
  }
  if (typeof client_name !== 'string' || client_name.trim().length === 0) {
    throw new ApiError('client_name must be a non-empty string', 400, 'INVALID_CLIENT_NAME');
  }
  if (!isValidDate(invoice_date)) {
    throw new ApiError('Invalid invoice_date — must be YYYY-MM-DD', 400, 'INVALID_DATE');
  }
  if (due_date && !isValidDate(due_date)) {
    throw new ApiError('Invalid due_date — must be YYYY-MM-DD', 400, 'INVALID_DATE');
  }
  if (!VALID_PAYMENT_STATUSES.has(payment_status)) {
    throw new ApiError(
      `Invalid payment_status. Must be one of: ${[...VALID_PAYMENT_STATUSES].join(', ')}`,
      400,
      'INVALID_PAYMENT_STATUS'
    );
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    throw new ApiError('Amount must be a non-negative number', 400, 'INVALID_AMOUNT');
  }

  const gstApplied = Boolean(gst_applied);
  const gst_amount = gstApplied ? parsedAmount * GST_RATE : 0;
  const total_amount = parsedAmount + gst_amount;

  // Auto-generate invoice number if not provided
  let resolvedInvoiceNumber = invoice_number?.trim() || null;
  if (!resolvedInvoiceNumber) {
    const [countRow] = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM invoices
      WHERE user_id = ${userId}
        AND fy = ${fy}
    `;
    resolvedInvoiceNumber = genInvoiceNumber(countRow?.cnt ?? 0);
  }

  const [invoice] = await sql`
    INSERT INTO invoices (
      user_id, fy, invoice_number, client_name, description,
      amount, gst_applied, gst_amount, total_amount,
      invoice_date, due_date, payment_status, notes
    ) VALUES (
      ${userId}, ${fy}, ${resolvedInvoiceNumber}, ${client_name.trim()},
      ${description?.trim() || null},
      ${parsedAmount}, ${gstApplied}, ${gst_amount}, ${total_amount},
      ${invoice_date}, ${due_date || null}, ${payment_status}, ${notes?.trim() || null}
    )
    RETURNING *
  `;

  return jsonResponse({ invoice }, 201);
}

// ── PUT /api/invoices ──────────────────────────────────────────────────────
async function updateInvoice(request) {
  const userId = getUserId(request);
  const body = await parseBody(request);
  const { id, ...rawUpdates } = body;

  if (!id) {
    throw new ApiError('id is required', 400, 'MISSING_ID');
  }

  // Filter to allowed, safe columns only
  const updates = {};
  for (const [key, value] of Object.entries(rawUpdates)) {
    if (ALLOWED_UPDATE_FIELDS.has(key) && isSafeColumnName(key)) {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError('No valid fields to update', 400, 'NO_VALID_FIELDS');
  }

  // Field-level validation
  if (updates.payment_status !== undefined && !VALID_PAYMENT_STATUSES.has(updates.payment_status)) {
    throw new ApiError('Invalid payment_status', 400, 'INVALID_PAYMENT_STATUS');
  }
  if (updates.invoice_date !== undefined && !isValidDate(updates.invoice_date)) {
    throw new ApiError('Invalid invoice_date', 400, 'INVALID_DATE');
  }
  if (updates.due_date !== undefined && updates.due_date && !isValidDate(updates.due_date)) {
    throw new ApiError('Invalid due_date', 400, 'INVALID_DATE');
  }
  if (updates.amount !== undefined) {
    const v = parseFloat(updates.amount);
    if (isNaN(v) || v < 0) throw new ApiError('Invalid amount', 400, 'INVALID_AMOUNT');
    updates.amount = v;
  }

  // Recompute gst_amount / total_amount if amount or gst_applied changed
  if (updates.amount !== undefined || updates.gst_applied !== undefined) {
    const [current] = await sql`
      SELECT amount, gst_applied
      FROM invoices
      WHERE id = ${id}
        AND user_id = ${userId}
    `;
    if (!current) {
      throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
    }

    const newAmount = updates.amount !== undefined
      ? parseFloat(updates.amount)
      : parseFloat(current.amount);
    const newGstApplied = updates.gst_applied !== undefined
      ? Boolean(updates.gst_applied)
      : current.gst_applied;

    updates.gst_amount = newGstApplied ? newAmount * GST_RATE : 0;
    updates.total_amount = newAmount + updates.gst_amount;
  }

  // Auto-set payment_date when marking as paid
  if (updates.payment_status === 'paid' && !updates.payment_date) {
    updates.payment_date = new Date().toISOString().split('T')[0];
  }

  const fields = Object.keys(updates);
  const setClauses = fields.map((k, i) => `"${k}" = $${i + 3}`).join(', ');

  const result = await sql(
    `UPDATE invoices
     SET ${setClauses}, updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
     RETURNING *`,
    [id, userId, ...fields.map((k) => updates[k])]
  );

  if (!result.length) {
    throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
  }

  return jsonResponse({ invoice: result[0] });
}

// ── DELETE /api/invoices ───────────────────────────────────────────────────
async function deleteInvoice(request) {
  const userId = getUserId(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || id.trim().length === 0) {
    throw new ApiError('id query parameter is required', 400, 'MISSING_ID');
  }

  const result = await sql`
    DELETE FROM invoices
    WHERE id = ${id}
      AND user_id = ${userId}
    RETURNING id
  `;

  if (!result.length) {
    throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
  }

  return jsonResponse({ success: true });
}

// ── Exports ────────────────────────────────────────────────────────────────
export const GET    = withMiddleware(listInvoices,   { routeName: 'GET /api/invoices' });
export const POST   = withMiddleware(createInvoice,  { routeName: 'POST /api/invoices', rateLimitMax: 60 });
export const PUT    = withMiddleware(updateInvoice,  { routeName: 'PUT /api/invoices', rateLimitMax: 60 });
export const DELETE = withMiddleware(deleteInvoice,  { routeName: 'DELETE /api/invoices', rateLimitMax: 60 });
