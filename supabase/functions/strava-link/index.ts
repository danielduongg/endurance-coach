// POST /functions/v1/strava-link   { "code": "<one-time link code>" }
//
// Binds the Strava athlete identified by the one-time `code` (minted in
// strava-callback) to the calling Supabase user, by setting
// strava_accounts.owner_uid = auth.uid(). After this, the activities RLS
// policies let that user — and only that user — read their athlete's data.
//
// Auth: deployed with --no-verify-jwt so we can answer the browser's CORS
// preflight, but the handler itself REQUIRES a valid Supabase user (anonymous
// is fine) — an anon key with no user session gets 401. Tokens never leave the
// server: this runs the privileged update with the service-role client.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sb } from "../_shared/strava.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST { code }" }, 405);

  // Identify the caller from their JWT (must be a real, signed-in Supabase user).
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
  const { data: { user }, error: uErr } = await asUser.auth.getUser();
  if (uErr || !user) return json({ error: "unauthorized" }, 401);

  const { code } = await req.json().catch(() => ({}));
  if (!code || typeof code !== "string") return json({ error: "code required" }, 400);

  // Find the account holding this (unexpired) one-time code. Service role only.
  const { data: acct, error } = await sb
    .from("strava_accounts")
    .select("athlete_id, link_code_expires_at")
    .eq("link_code", code)
    .maybeSingle();
  if (error) { console.error("link lookup failed", error); return json({ error: "server error" }, 500); }
  if (!acct || !acct.link_code_expires_at || new Date(acct.link_code_expires_at) < new Date()) {
    return json({ error: "invalid or expired code" }, 400);
  }

  // Claim it: bind to this user and burn the code (the extra link_code match
  // guards against a double-submit racing in after the code is cleared).
  const { error: upErr } = await sb
    .from("strava_accounts")
    .update({
      owner_uid: user.id,
      link_code: null,
      link_code_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("athlete_id", acct.athlete_id)
    .eq("link_code", code);
  if (upErr) { console.error("link update failed", upErr); return json({ error: "server error" }, 500); }

  // Stamp the athlete id on the user so the app can read it straight from the session.
  await sb.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(user.app_metadata || {}), athlete_id: acct.athlete_id },
  }).catch((e) => console.error("metadata stamp failed", e));

  return json({ ok: true, athlete_id: acct.athlete_id });
});
