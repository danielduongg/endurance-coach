// GET /functions/v1/strava-callback?code=...&state=<mode>|<app url>
// Public endpoint (verify_jwt = false). Two modes (set by strava-auth):
//   login → create/load a Strava-backed Supabase user, link the data, and hand the app
//           a one-time login token (verifyOtp) — so "Sign in with Strava" = login + data.
//   link  → issue a one-time code the app exchanges (strava-link) to attach this Strava
//           athlete to the already-signed-in (e.g. Google) account.

import { backfillAthlete, exchangeCode, sb, waitUntil } from "../_shared/strava.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const raw = url.searchParams.get("state") || "";
  const sep = raw.indexOf("|");
  const mode = sep >= 0 ? raw.slice(0, sep) : "link";
  const appUrl = (sep >= 0 ? raw.slice(sep + 1) : raw) || Deno.env.get("APP_URL") || "/";

  // User clicked "Cancel" on Strava's consent screen.
  if (url.searchParams.get("error")) {
    return Response.redirect(`${appUrl}?strava=denied`, 302);
  }
  const code = url.searchParams.get("code");
  if (!code) return new Response("Missing ?code", { status: 400 });

  try {
    const t = await exchangeCode(code);
    const athleteId: number = t.athlete.id;

    const base = {
      athlete_id: athleteId,
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: t.expires_at,
      firstname: t.athlete.firstname ?? null,
      lastname: t.athlete.lastname ?? null,
      scope: url.searchParams.get("scope") ?? "",
      updated_at: new Date().toISOString(),
    };

    const dest = new URL(appUrl);
    dest.searchParams.set("athlete", String(athleteId));
    dest.searchParams.set("strava", "connected");

    const bf = () =>
      waitUntil(
        backfillAthlete(athleteId, 180)
          .then((n) => console.log(`backfilled ${n} activities for ${athleteId}`))
          .catch((e) => console.error("backfill failed", e)),
      );

    if (mode === "login") {
      // One Strava athlete ↔ one Supabase user, keyed by a synthetic email. No mail is
      // ever sent — the login token is generated server-side and exchanged via verifyOtp.
      const email = `strava-${athleteId}@strava.invalid`;
      const meta = { provider: "strava", athlete_id: athleteId };
      await sb.auth.admin.createUser({ email, email_confirm: true, app_metadata: meta }).catch(() => {});
      const { data: link, error: linkErr } = await sb.auth.admin.generateLink({ type: "magiclink", email });
      if (linkErr || !link?.user) throw linkErr ?? new Error("could not create login session");
      const userId = link.user.id;
      await sb.auth.admin.updateUserById(userId, { app_metadata: meta }).catch(() => {});

      const { error } = await sb.from("strava_accounts").upsert({ ...base, owner_uid: userId });
      if (error) throw error;
      bf();

      dest.searchParams.set("login", "strava");
      dest.searchParams.set("token_hash", link.properties.hashed_token);
      return Response.redirect(dest.toString(), 302);
    }

    // mode === "link": attach to the signed-in account via a one-time code (strava-link).
    const linkCode = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const linkExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await sb.from("strava_accounts").upsert({ ...base, link_code: linkCode, link_code_expires_at: linkExpires });
    if (error) throw error;
    bf();

    dest.searchParams.set("link", linkCode);
    return Response.redirect(dest.toString(), 302);
  } catch (e) {
    console.error("oauth callback failed", e);
    return new Response("Strava connection failed — check function logs.", { status: 500 });
  }
});
