// /functions/v1/strava-webhook — Strava pushes events here when a workout syncs.
// GET  = one-time subscription validation handshake (hub.challenge echo).
// POST = activity / athlete events. Strava requires a 200 within 2 seconds,
//        so we ack immediately and do the API fetch + upsert in the background.
// Public endpoint (verify_jwt = false).

import { fetchActivity, normalize, sb, waitUntil } from "../_shared/strava.ts";

Deno.serve(async (req) => {
  // --- Subscription validation handshake ---
  if (req.method === "GET") {
    const u = new URL(req.url);
    const ok = u.searchParams.get("hub.mode") === "subscribe" &&
      u.searchParams.get("hub.verify_token") === Deno.env.get("STRAVA_VERIFY_TOKEN");
    if (!ok) return new Response("verify_token mismatch", { status: 403 });
    return new Response(
      JSON.stringify({ "hub.challenge": u.searchParams.get("hub.challenge") }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (req.method !== "POST") return new Response("ok");

  const evt = await req.json().catch(() => null);
  if (evt) waitUntil(handleEvent(evt));
  return new Response("EVENT_RECEIVED", { status: 200 });
});

// deno-lint-ignore no-explicit-any
async function handleEvent(evt: any) {
  try {
    // Athlete revoked access in Strava settings → forget them (activities cascade-delete).
    if (evt.object_type === "athlete") {
      if (evt.updates?.authorized === "false") {
        await sb.from("strava_accounts").delete().eq("athlete_id", evt.owner_id);
        console.log(`athlete ${evt.owner_id} deauthorized — account removed`);
      }
      return;
    }

    if (evt.object_type !== "activity") return;
    const rowId = "strava:" + evt.object_id;

    if (evt.aspect_type === "delete") {
      await sb.from("activities").delete().eq("id", rowId);
      return;
    }

    // create | update → fetch full details, normalize, upsert
    const a = await fetchActivity(evt.owner_id, evt.object_id);
    if (!a) return;
    const row = normalize(a, evt.owner_id);
    if (row) {
      const { error } = await sb.from("activities").upsert(row, { onConflict: "id" });
      if (error) throw error;
    } else if (evt.aspect_type === "update") {
      // e.g. user re-typed a Run as a Hike — it no longer belongs in the app
      await sb.from("activities").delete().eq("id", rowId);
    }
  } catch (e) {
    console.error("webhook event failed", evt, e);
  }
}
