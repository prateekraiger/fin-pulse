import { isDatabaseHealthy } from "@/app/api/utils/sql";

/**
 * GET /api/health
 *
 * Readiness / liveness probe for load balancers and monitoring.
 * Returns 200 with component-level status.
 */
export async function GET() {
  const start = Date.now();
  let dbHealthy = false;

  try {
    dbHealthy = await isDatabaseHealthy();
  } catch {
    dbHealthy = false;
  }

  const latencyMs = Date.now() - start;
  const overall = dbHealthy ? "healthy" : "degraded";

  return Response.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      checks: {
        database: dbHealthy ? "ok" : "unavailable",
      },
      latency_ms: latencyMs,
    },
    {
      status: dbHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
