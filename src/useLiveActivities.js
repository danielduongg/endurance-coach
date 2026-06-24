// useLiveActivities — real Strava sync for signed-in users.
//
// Auth: real accounts (Strava or Google). On return from "Sign in with Strava",
// the URL carries a one-time login token (token_hash) we exchange via verifyOtp.
// On the Google path, the URL carries a one-time `link` code we exchange via the
// strava-link function to attach the athlete to the account. Data is read under
// RLS (scoped to the signed-in user), so no client-side athlete filter is required.

import { useCallback, useEffect, useState } from "react";
import { FUNCTIONS_URL, supabase, stravaConfigured, stravaConnectUrl } from "./supabaseClient";

const MI = 1609.34;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } };

const toApp = (r) => ({
  id: r.id,
  key: r.day,
  sport: r.sport === "support" ? "strength" : r.sport,
  hours: Number(r.hours),
  distMi: r.distance_m != null ? Number(r.distance_m) / MI : null,
  avgHR: r.avg_hr != null ? Number(r.avg_hr) : null,
});

export function useLiveActivities({ historyDays = 180 } = {}) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [activities, setActivities] = useState([]);
  const [status, setStatus] = useState("disconnected"); // disconnected | loading | live | error

  // Establish the session: finish a Strava login if the URL carries a login token,
  // then track auth state.
  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let sub;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get("token_hash");
        if (tokenHash && params.get("login") === "strava") {
          const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
          if (error) console.error("strava login failed", error);
        }
      } catch (e) { console.error(e); }
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthReady(true);
      sub = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null)).data.subscription;
    })();
    return () => { sub?.unsubscribe?.(); };
  }, []);

  // Once signed in, exchange a Strava `link` code (Google path) and tidy the URL.
  useEffect(() => {
    if (typeof window === "undefined" || !supabase || !authReady) return;
    const params = new URLSearchParams(window.location.search);
    const a = params.get("athlete");
    const code = params.get("link");
    if (a) lsSet("strava_athlete", a);
    (async () => {
      if (code && user) {
        const { error } = await supabase.functions.invoke("strava-link", { body: { code } });
        if (error) console.error("strava link failed", error);
      }
      if (a || code || params.get("login") || params.get("token_hash") || params.get("strava")) {
        const u = new URL(window.location.href);
        ["athlete", "strava", "link", "login", "token_hash", "type"].forEach((k) => u.searchParams.delete(k));
        window.history.replaceState({}, "", u.pathname + (u.search || ""));
      }
    })();
  }, [authReady, user]);

  // Athlete id, straight from the session (set server-side at login/link), with a
  // localStorage fallback for the moment right after the redirect.
  const athleteId = user?.app_metadata?.athlete_id ?? lsGet("strava_athlete");

  // Initial history load + realtime subscription (RLS scopes both to this user).
  useEffect(() => {
    if (!supabase || !user) { setActivities([]); setStatus("disconnected"); return; }
    let channel;
    let cancelled = false;
    (async () => {
      setStatus("loading");
      const since = new Date(Date.now() - historyDays * 864e5).toISOString().slice(0, 10);
      let q = supabase.from("activities").select("id, day, sport, hours, distance_m, avg_hr")
        .gte("day", since).order("day", { ascending: true });
      if (athleteId) q = q.eq("athlete_id", athleteId);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) { console.error(error); setStatus("error"); return; }
      setActivities(data.map(toApp));
      setStatus("live");

      channel = supabase
        .channel("activities-" + user.id)
        .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, (payload) => {
          setActivities((prev) => {
            if (payload.eventType === "DELETE") return prev.filter((x) => x.id !== payload.old.id);
            const row = toApp(payload.new);
            const i = prev.findIndex((x) => x.id === row.id);
            if (i >= 0) { const copy = [...prev]; copy[i] = row; return copy; }
            return [...prev, row];
          });
        })
        .subscribe();
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [user, athleteId, historyDays]);

  // Manual logging (RLS: source='manual', id 'manual:*', own athlete only).
  const logManual = useCallback(async ({ key, sport, hours, distMi }) => {
    if (!athleteId || !supabase) return { error: "Connect Strava first" };
    const uuid = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
    const { error } = await supabase.from("activities").insert({
      id: "manual:" + uuid,
      athlete_id: Number(athleteId),
      day: key, sport, hours,
      distance_m: distMi ? distMi * MI : null,
      source: "manual",
    });
    if (error) console.error(error);
    return { error };
  }, [athleteId]);

  const disconnect = useCallback(() => {
    lsDel("strava_athlete");
    setActivities([]);
    setStatus("disconnected");
    // Full disconnect = sign out (identity is the login now). The UI's Sign out does that.
    // To revoke Strava entirely, remove the app at strava.com/settings/apps.
  }, []);

  // Button for an already-signed-in account (e.g. Google) to attach Strava data.
  const connectUrl = (stravaConfigured && typeof window !== "undefined") ? stravaConnectUrl() : "";

  return { activities, athleteId, status, user, authReady, logManual, disconnect, connectUrl, configured: stravaConfigured };
}
