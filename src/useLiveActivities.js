// useLiveActivities — real Strava sync for the deployed app.
//
// Flow: watch → Strava → webhook → Postgres → realtime → here.
// Returns activities in the app's shape { id, key, sport, hours, distMi, avgHR },
// so distance + HR flow through to the VO2max engine and the 80/20 check.
//
// localStorage is wrapped so this also no-ops safely in sandboxes that block it.

import { useCallback, useEffect, useState } from "react";
import { FUNCTIONS_URL, supabase, stravaConfigured } from "./supabaseClient";

const MI = 1609.34;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } };

const toApp = (r) => ({
  id: r.id,
  key: r.day,
  sport: r.sport === "support" ? "strength" : r.sport, // tolerate older rows
  hours: Number(r.hours),
  distMi: r.distance_m != null ? Number(r.distance_m) / MI : null,
  avgHR: r.avg_hr != null ? Number(r.avg_hr) : null,
});

export function useLiveActivities({ historyDays = 180 } = {}) {
  const [athleteId, setAthleteId] = useState(() => lsGet("strava_athlete"));
  const [activities, setActivities] = useState([]);
  const [status, setStatus] = useState("disconnected"); // disconnected | loading | live | error

  // Catch the redirect back from strava-callback: ?athlete=123&strava=connected
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const a = params.get("athlete");
    if (a) {
      lsSet("strava_athlete", a);
      setAthleteId(a);
      const u = new URL(window.location.href);
      u.searchParams.delete("athlete");
      u.searchParams.delete("strava");
      window.history.replaceState({}, "", u.pathname + (u.search || "")); // tidy URL
    }
  }, []);

  // Initial history load + realtime subscription
  useEffect(() => {
    if (!athleteId || !supabase) return;
    let channel;
    let cancelled = false;

    (async () => {
      setStatus("loading");
      const since = new Date(Date.now() - historyDays * 864e5).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("activities")
        .select("id, day, sport, hours, distance_m, avg_hr")
        .eq("athlete_id", athleteId)
        .gte("day", since)
        .order("day", { ascending: true });

      if (cancelled) return;
      if (error) { console.error(error); setStatus("error"); return; }
      setActivities(data.map(toApp));
      setStatus("live");

      channel = supabase
        .channel(`activities-${athleteId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "activities", filter: `athlete_id=eq.${athleteId}` },
          (payload) => {
            setActivities((prev) => {
              if (payload.eventType === "DELETE") return prev.filter((x) => x.id !== payload.old.id);
              const row = toApp(payload.new);
              const i = prev.findIndex((x) => x.id === row.id);
              if (i >= 0) { const copy = [...prev]; copy[i] = row; return copy; }
              return [...prev, row];
            });
          },
        )
        .subscribe();
    })();

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [athleteId, historyDays]);

  // Manual logging (a session the watch missed). RLS only allows source='manual', id 'manual:*'.
  const logManual = useCallback(async ({ key, sport, hours, distMi }) => {
    if (!athleteId || !supabase) return { error: "Connect Strava first" };
    const uuid = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
    const { error } = await supabase.from("activities").insert({
      id: "manual:" + uuid,
      athlete_id: Number(athleteId),
      day: key,
      sport,
      hours,
      distance_m: distMi ? distMi * MI : null,
      source: "manual",
    });
    if (error) console.error(error);
    return { error }; // realtime echoes the row back — no local mutation needed
  }, [athleteId]);

  const disconnect = useCallback(() => {
    lsDel("strava_athlete");
    setAthleteId(null);
    setActivities([]);
    setStatus("disconnected");
    // To fully revoke, remove the app at strava.com/settings/apps —
    // the webhook's deauthorization event then wipes server-side data.
  }, []);

  const connectUrl = (stravaConfigured && typeof window !== "undefined")
    ? `${FUNCTIONS_URL}/strava-auth?return=${encodeURIComponent(window.location.origin + window.location.pathname)}`
    : "";

  return { activities, athleteId, status, logManual, disconnect, connectUrl, configured: stravaConfigured };
}
