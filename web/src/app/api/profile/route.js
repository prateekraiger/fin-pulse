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
const VALID_PROFILE_TYPES = new Set(['freelancer', 'creator', 'consultant', 'other']);

const VALID_STATE_CATEGORIES = new Set(['normal', 'special']);

/** States/UTs in the special category (₹10L GST threshold). */
const SPECIAL_CATEGORY_STATES = new Set([
  'Arunachal Pradesh',
  'Assam',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Sikkim',
  'Tripura',
  'Uttarakhand',
]);

const VALID_STATES = new Set([
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]);

const GST_THRESHOLD_NORMAL  = 2_000_000; // ₹20L
const GST_THRESHOLD_SPECIAL = 1_000_000; // ₹10L

function parseFY(fy) {
  if (!fy || typeof fy !== 'string') return false;
  const [a, b] = fy.split('-').map(Number);
  return !isNaN(a) && !isNaN(b) && b === a + 1 && a >= 2000 && a <= 2100;
}

// ── GET /api/profile ───────────────────────────────────────────────────────
async function getProfile(request) {
  const userId = getUserId(request);

  const [profile] = await sql`
    SELECT *
    FROM user_profiles
    WHERE user_id = ${userId}
  `;

  return jsonResponse({ profile: profile ?? null });
}

// ── POST /api/profile ──────────────────────────────────────────────────────
async function saveProfile(request) {
  const userId = getUserId(request);
  const body = await parseBody(request);

  requireFields(body, ['profile_type', 'state', 'state_category', 'current_fy']);

  const {
    profile_type,
    state,
    state_category,
    service_type,
    digital_receipts_majority,
    current_fy,
  } = body;

  // Validate inputs
  if (!VALID_PROFILE_TYPES.has(profile_type)) {
    throw new ApiError(
      `Invalid profile_type. Must be one of: ${[...VALID_PROFILE_TYPES].join(', ')}`,
      400,
      'INVALID_PROFILE_TYPE'
    );
  }
  if (!VALID_STATES.has(state)) {
    throw new ApiError('Invalid state / UT name', 400, 'INVALID_STATE');
  }
  if (!VALID_STATE_CATEGORIES.has(state_category)) {
    throw new ApiError(
      "Invalid state_category. Must be 'normal' or 'special'",
      400,
      'INVALID_STATE_CATEGORY'
    );
  }
  if (!parseFY(current_fy)) {
    throw new ApiError(
      'Invalid current_fy format (expected e.g. 2025-2026)',
      400,
      'INVALID_FY'
    );
  }

  // Derive the correct state_category from the state name (server-authoritative)
  const derivedStateCategory = SPECIAL_CATEGORY_STATES.has(state) ? 'special' : 'normal';

  // If the client sent a conflicting state_category, use the server's value
  const resolvedStateCategory = derivedStateCategory;

  const threshold = resolvedStateCategory === 'special'
    ? GST_THRESHOLD_SPECIAL
    : GST_THRESHOLD_NORMAL;

  const [profile] = await sql`
    INSERT INTO user_profiles (
      user_id, profile_type, state, state_category,
      service_type, digital_receipts_majority, current_fy
    ) VALUES (
      ${userId}, ${profile_type}, ${state}, ${resolvedStateCategory},
      ${service_type?.trim() || null}, ${Boolean(digital_receipts_majority)}, ${current_fy}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      profile_type              = EXCLUDED.profile_type,
      state                     = EXCLUDED.state,
      state_category            = EXCLUDED.state_category,
      service_type              = EXCLUDED.service_type,
      digital_receipts_majority = EXCLUDED.digital_receipts_majority,
      current_fy                = EXCLUDED.current_fy,
      updated_at                = NOW()
    RETURNING *
  `;

  // Upsert GST threshold in gst_settings
  await sql`
    INSERT INTO gst_settings (user_id, threshold_limit)
    VALUES (${userId}, ${threshold})
    ON CONFLICT (user_id) DO UPDATE SET
      threshold_limit = EXCLUDED.threshold_limit,
      updated_at      = NOW()
  `;

  return jsonResponse({ profile }, 200);
}

// ── Exports ────────────────────────────────────────────────────────────────
export const GET  = withMiddleware(getProfile,  { routeName: 'GET /api/profile' });
export const POST = withMiddleware(saveProfile, { routeName: 'POST /api/profile', rateLimitMax: 30 });
