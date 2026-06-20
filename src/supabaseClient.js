// Frontend Supabase client + auth helpers.
// Real accounts only: sign in with Strava (primary) or Google. No anonymous sessions.
//   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY must be set (Vercel + .env).
import { createClient } from "@supabase/supabase-js";

const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
const url = env.VITE_SUPABASE_URL || (typeof window !== "undefined" && window.SUPABASE_URL) || "";
const anonKey = env.VITE_SUPABASE_ANON_KEY || (typeof window !== "undefined" && window.SUPABASE_ANON_KEY) || "";

export const stravaConfigured = Boolean(url && anonKey);
if (!stravaConfigured && typeof console !== "undefined") {
  console.warn("Backend not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = stravaConfigured ? createClient(url, anonKey) : null;
export const FUNCTIONS_URL = url ? `${url}/functions/v1` : "";

const appReturn = () =>
  typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

// Returns the current signed-in user id, or null. (No anonymous sign-in anymore —
// access is gated by login + trial/subscription.)
export async function ensureSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// Sign in with Strava (primary): one tap = login + data connection. strava-auth →
// strava-callback creates/loads the Strava-backed account, links data, and logs in.
export function stravaLoginUrl() {
  return stravaConfigured
    ? `${FUNCTIONS_URL}/strava-auth?mode=login&return=${encodeURIComponent(appReturn())}`
    : "";
}

// Connect Strava data to an already-signed-in (e.g. Google) account.
export function stravaConnectUrl() {
  return stravaConfigured
    ? `${FUNCTIONS_URL}/strava-auth?mode=link&return=${encodeURIComponent(appReturn())}`
    : "";
}

export async function signInWithGoogle() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: appReturn() } });
}

// --- Per-user profile (training setup) saved to the account ---------------
// So personal data (race, age, weight, weekly hours, the in-progress setup
// form) follows the user across devices instead of living only in this
// browser. RLS scopes every read/write to the signed-in user's own row.
export async function loadProfile() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles").select("settings, draft").eq("user_id", user.id).maybeSingle();
  if (error) { console.warn("loadProfile failed:", error.message); return null; }
  return data; // { settings, draft } | null
}

export async function saveProfile(patch) {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const row = { user_id: user.id, updated_at: new Date().toISOString() };
  if ("settings" in patch) row.settings = patch.settings;
  if ("draft" in patch) row.draft = patch.draft;
  const { error } = await supabase.from("profiles").upsert(row, { onConflict: "user_id" });
  if (error) console.warn("saveProfile failed:", error.message);
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}
