// Frontend Supabase client. Uses the ANON key only — never ship the service-role key.
// Set these in your host's env (and .env locally):
//   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<anon public key>
// Until they're set, `supabase` is null and the app runs in offline mode
// (CSV import / manual logging / demo) with the Strava button disabled.

import { createClient } from "@supabase/supabase-js";

const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
const url = env.VITE_SUPABASE_URL || (typeof window !== "undefined" && window.SUPABASE_URL) || "";
const anonKey = env.VITE_SUPABASE_ANON_KEY || (typeof window !== "undefined" && window.SUPABASE_ANON_KEY) || "";

export const stravaConfigured = Boolean(url && anonKey);
if (!stravaConfigured && typeof console !== "undefined") {
  console.warn("Strava live sync disabled — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable it.");
}

export const supabase = stravaConfigured ? createClient(url, anonKey) : null;
export const FUNCTIONS_URL = url ? `${url}/functions/v1` : "";

// Identity model: "Strava is the login." The app signs in anonymously to get a
// real (refreshable) Supabase session so Row-Level Security can scope data to
// this user. Connecting Strava then binds that athlete to this session
// (see strava-link). Without a session, RLS returns nothing — i.e. fails closed.
let _sessionPromise = null;
export function ensureSession() {
  if (!supabase) return Promise.resolve(null);
  if (!_sessionPromise) {
    _sessionPromise = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return session.user.id;
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) { console.error("anonymous sign-in failed", error); return null; }
      return data.user?.id ?? null;
    })();
  }
  return _sessionPromise;
}
