// POST /functions/v1/strava-backfill  { "athlete_id": 12345, "days": 180 }
// Re-pulls history on demand (e.g. you want 365 days, or the initial backfill was interrupted).
// Keeps verify_jwt = true: call it with your service-role key or a logged-in user's JWT —
// never expose this to anonymous traffic.

import { backfillAthlete } from "../_shared/strava.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response('POST JSON: { "athlete_id": number, "days"?: number }', { status: 405 });
  }
  const body = await req.json().catch(() => ({}));
  const athleteId = Number(body.athlete_id);
  if (!athleteId) return new Response("athlete_id required", { status: 400 });

  const days = Math.min(Math.max(Number(body.days) || 180, 7), 365);
  try {
    const imported = await backfillAthlete(athleteId, days);
    return Response.json({ ok: true, athlete_id: athleteId, days, imported });
  } catch (e) {
    console.error("manual backfill failed", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
