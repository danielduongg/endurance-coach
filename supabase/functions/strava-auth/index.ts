// GET /functions/v1/strava-auth?mode=login|link&return=<app url>
// Sends the user to Strava's consent screen. Public endpoint (verify_jwt = false).
//   mode=login → callback creates/loads a Strava-backed Supabase account and logs in
//   mode=link  → callback issues a one-time code to attach Strava to the current account

Deno.serve((req) => {
  const url = new URL(req.url);
  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/strava-callback`;

  const auth = new URL("https://www.strava.com/oauth/authorize");
  auth.searchParams.set("client_id", Deno.env.get("STRAVA_CLIENT_ID")!);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("approval_prompt", "auto");
  auth.searchParams.set("scope", "read,activity:read_all"); // read_all = private activities too

  // Strava round-trips a single `state` string — pack mode + return URL into it.
  const mode = url.searchParams.get("mode") === "login" ? "login" : "link";
  const ret = url.searchParams.get("return") || Deno.env.get("APP_URL") || "/";
  auth.searchParams.set("state", mode + "|" + ret);

  return Response.redirect(auth.toString(), 302);
});
