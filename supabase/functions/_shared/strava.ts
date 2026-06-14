// Shared Strava helpers for Supabase Edge Functions (Deno).
// Everything here runs server-side with the service-role key — never import from the frontend.

import { createClient } from "npm:@supabase/supabase-js@2";

export const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const STRAVA = "https://www.strava.com";

/** Run work after the response is sent (Strava requires a 200 ack within 2 seconds). */
export function waitUntil(p: Promise<unknown>) {
  const rt = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p);
  else p.catch((e) => console.error("background task failed", e));
}

/** Map Strava sport_type → the app's four buckets. Mirrors classify() in iron-coach.jsx. */
export function classify(sportType: string): "swim" | "bike" | "run" | "strength" | null {
  const s = (sportType || "").toLowerCase();
  if (s.includes("swim")) return "swim";
  if (s.includes("ride") || s.includes("velomobile") || s.includes("handcycle")) return "bike";
  if (s.includes("run")) return "run";
  if (["weighttraining", "workout", "crossfit", "yoga", "pilates", "hiit"].includes(s)) return "strength";
  return null; // walks, hikes, golf, etc. — ignored on purpose
}

/** One Strava activity (summary or detail) → one `activities` row, or null if not relevant. */
// deno-lint-ignore no-explicit-any
export function normalize(a: any, athleteId: number) {
  const sport = classify(a.sport_type || a.type);
  if (!sport) return null;
  const hours = (a.moving_time ?? a.elapsed_time ?? 0) / 3600;
  if (hours <= 0 || hours > 18) return null;
  return {
    id: "strava:" + a.id,
    athlete_id: athleteId,
    day: String(a.start_date_local || a.start_date || "").slice(0, 10),
    sport,
    hours: Math.round(hours * 1000) / 1000,
    distance_m: a.distance ?? null,
    avg_hr: a.average_heartrate ?? null,
    name: a.name ?? null,
    raw_type: a.sport_type || a.type || null,
    start_date: a.start_date ?? null,
    source: "strava",
  };
}

export async function exchangeCode(code: string) {
  const res = await fetch(`${STRAVA}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Returns a valid access token, refreshing (and persisting the rotated refresh token) if needed. */
export async function getValidToken(athleteId: number): Promise<string> {
  const { data: acct, error } = await sb
    .from("strava_accounts").select("*").eq("athlete_id", athleteId).single();
  if (error || !acct) throw new Error(`unknown athlete ${athleteId}`);

  const now = Math.floor(Date.now() / 1000);
  if (acct.expires_at - 60 > now) return acct.access_token;

  const res = await fetch(`${STRAVA}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: acct.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status} ${await res.text()}`);
  const t = await res.json();

  // Strava rotates refresh tokens — always store the new pair.
  await sb.from("strava_accounts").update({
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
    updated_at: new Date().toISOString(),
  }).eq("athlete_id", athleteId);

  return t.access_token;
}

export async function fetchActivity(athleteId: number, activityId: number) {
  const token = await getValidToken(athleteId);
  const res = await fetch(`${STRAVA}/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null; // deleted or not visible under granted scope
  if (!res.ok) throw new Error(`activity fetch failed: ${res.status}`);
  return res.json();
}

/** Pull recent history so Coach's Read has a baseline on day one. Returns rows imported. */
export async function backfillAthlete(athleteId: number, days = 180): Promise<number> {
  const token = await getValidToken(athleteId);
  const after = Math.floor(Date.now() / 1000) - days * 86400;
  let page = 1, total = 0;

  while (page <= 10) { // 10 × 200 = 2,000 activities max; plenty for 180 days
    const res = await fetch(
      `${STRAVA}/api/v3/athlete/activities?after=${after}&per_page=200&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`backfill page ${page} failed: ${res.status}`);
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) break;

    const rows = list.map((a) => normalize(a, athleteId)).filter(Boolean);
    if (rows.length) {
      const { error } = await sb.from("activities").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      total += rows.length;
    }
    if (list.length < 200) break;
    page++;
  }

  await sb.from("strava_accounts").update({ backfilled: true }).eq("athlete_id", athleteId);
  return total;
}
