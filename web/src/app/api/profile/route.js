import sql from "@/app/api/utils/sql";

function getUserId(req) {
  return req.headers.get("x-user-id") || "demo-user";
}

// Get user profile
export async function GET(request) {
  try {
    const userId = getUserId(request);
    const [profile] =
      await sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`;
    return Response.json({ profile: profile || null });
  } catch (error) {
    console.error("GET /api/profile:", error);
    return Response.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// Create or update user profile
export async function POST(request) {
  try {
    const userId = getUserId(request);
    const body = await request.json();
    const {
      profile_type,
      state,
      state_category,
      service_type,
      digital_receipts_majority,
      current_fy,
    } = body;
    if (!profile_type || !state || !state_category || !current_fy)
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    const threshold = state_category === "special" ? 1000000 : 2000000;

    const [profile] = await sql`
      INSERT INTO user_profiles (user_id, profile_type, state, state_category, service_type, digital_receipts_majority, current_fy)
      VALUES (${userId}, ${profile_type}, ${state}, ${state_category}, ${service_type || null}, ${digital_receipts_majority ?? false}, ${current_fy})
      ON CONFLICT (user_id) DO UPDATE SET
        profile_type = EXCLUDED.profile_type,
        state = EXCLUDED.state,
        state_category = EXCLUDED.state_category,
        service_type = EXCLUDED.service_type,
        digital_receipts_majority = EXCLUDED.digital_receipts_majority,
        current_fy = EXCLUDED.current_fy,
        updated_at = NOW()
      RETURNING *
    `;

    await sql`
      INSERT INTO gst_settings (user_id, threshold_limit)
      VALUES (${userId}, ${threshold})
      ON CONFLICT (user_id) DO UPDATE SET threshold_limit = EXCLUDED.threshold_limit, updated_at = NOW()
    `;

    return Response.json({ profile });
  } catch (error) {
    console.error("POST /api/profile:", error);
    return Response.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
