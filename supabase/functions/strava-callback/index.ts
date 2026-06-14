// GET /functions/v1/strava-callback?code=...&state=<app url>
// Token exchange + account upsert + background backfill. Public endpoint (verify_jwt = false).

import { backfillAthlete, exchangeCode, sb, waitUntil } from "../_shared/strava.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const appUrl = url.searchParams.get("state") || Deno.env.get("APP_URL") || "/";

  // User clicked "Cancel" on Strava's consent screen.
  if (url.searchParams.get("error")) {
    return Response.redirect(`${appUrl}?strava=denied`, 302);
  }

  const code = url.searchParams.get("code");
  if (!code) return new Response("Missing ?code", { status: 400 });

  try {
    const t = await exchangeCode(code);
    const athleteId: number = t.athlete.id;

    const { error } = await sb.from("strava_accounts").upsert({
      athlete_id: athleteId,
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: t.expires_at,
      firstname: t.athlete.firstname ?? null,
      lastname: t.athlete.lastname ?? null,
      scope: url.searchParams.get("scope") ?? "",
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    // Pull 180 days of history without making the user wait on the redirect.
    waitUntil(
      backfillAthlete(athleteId, 180)
        .then((n) => console.log(`backfilled ${n} activities for ${athleteId}`))
        .catch((e) => console.error("backfill failed", e)),
    );

    const dest = new URL(appUrl);
    dest.searchParams.set("athlete", String(athleteId));
    dest.searchParams.set("strava", "connected");
    return Response.redirect(dest.toString(), 302);
  } catch (e) {
    console.error("oauth callback failed", e);
    return new Response("Strava connection failed — check function logs.", { status: 500 });
  }
});
