// GET /functions/v1/strava-auth?return=<app url>
// Sends the user to Strava's consent screen. Public endpoint (verify_jwt = false).

Deno.serve((req) => {
  const url = new URL(req.url);
  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/strava-callback`;

  const auth = new URL("https://www.strava.com/oauth/authorize");
  auth.searchParams.set("client_id", Deno.env.get("STRAVA_CLIENT_ID")!);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("approval_prompt", "auto");
  auth.searchParams.set("scope", "read,activity:read_all"); // read_all = private activities too

  // Where to send the user after the token exchange. Falls back to APP_URL secret.
  const ret = url.searchParams.get("return") || Deno.env.get("APP_URL") || "/";
  auth.searchParams.set("state", ret);

  return Response.redirect(auth.toString(), 302);
});
