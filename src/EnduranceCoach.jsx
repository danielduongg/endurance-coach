import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  Flag, Upload, Plus, Settings, CheckCircle2, AlertTriangle, Activity, Moon, ChevronDown, Zap,
  Waves, Bike, Footprints, Briefcase, Plane, Dumbbell, TrendingDown, TrendingUp, Gauge,
  Trophy, Shield, Star, Flame, Target, HeartPulse, FlaskConical, Wind,
  Medal, Radio, Link2, Mountain, Sun, Sparkles,
} from "lucide-react";
import { useLiveActivities } from "./useLiveActivities.js";
import { supabase, stravaLoginUrl, signInWithGoogle, signOut as authSignOut } from "./supabaseClient.js";

/* ------------------------------------------------------------------ */
/*  Design tokens — "race day" system, endurance edition               */
/* ------------------------------------------------------------------ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
:root{
  --paper:#F4F6FA; --card:rgba(255,255,255,.5); --ink:#162338; --ink-soft:#566480; --line:rgba(22,35,56,.12);
  --orange:#E8541E; --orange-soft:rgba(232,84,30,.12); --steel:#3D6B8E; --steel-soft:rgba(61,107,142,.14);
  --green:#3E7C59; --green-soft:rgba(62,124,89,.14); --amber:#C9821B; --amber-soft:rgba(201,130,27,.16); --red:#B3361F; --track:rgba(22,35,56,.10);
  --glass-stroke:rgba(255,255,255,.55);
  --glass-shadow:0 1px 1px rgba(22,35,56,.04),0 14px 40px rgba(22,35,56,.14);
  --glass-sheen:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(255,255,255,.18),inset 0 -10px 24px rgba(255,255,255,.05);
  --sheen-a:.5; --sheen-b:.16; --grad-base:linear-gradient(176deg,#F6F8FC 0%,#EAEEF5 52%,#E7EBF3 100%);
  --blobs:radial-gradient(1100px 760px at 8% -10%,rgba(232,84,30,.12),transparent 58%),radial-gradient(1000px 720px at 102% 4%,rgba(61,107,142,.16),transparent 55%),radial-gradient(900px 820px at 50% 118%,rgba(62,124,89,.13),transparent 60%);
}
.tc-root.tc-dark{
  --paper:#0A0E16; --card:rgba(30,38,54,.5); --ink:#EAF0F8; --ink-soft:#9CADC4; --line:rgba(255,255,255,.12);
  --orange-soft:rgba(232,84,30,.22); --steel-soft:rgba(90,160,210,.22); --green-soft:rgba(80,180,130,.22); --amber-soft:rgba(220,165,70,.24); --track:rgba(255,255,255,.14);
  --glass-stroke:rgba(255,255,255,.16);
  --glass-shadow:0 1px 1px rgba(0,0,0,.4),0 18px 46px rgba(0,0,0,.55);
  --glass-sheen:inset 0 1px 0 rgba(255,255,255,.3),inset 0 0 0 1px rgba(255,255,255,.06),inset 0 -12px 26px rgba(255,255,255,.03);
  --sheen-a:.22; --sheen-b:.1; --grad-base:linear-gradient(176deg,#0E141E 0%,#0A0E16 60%,#06090F 100%);
  --blobs:radial-gradient(1100px 760px at 8% -10%,rgba(232,84,30,.2),transparent 56%),radial-gradient(1000px 720px at 102% 4%,rgba(61,107,142,.26),transparent 55%),radial-gradient(900px 820px at 50% 120%,rgba(62,124,89,.18),transparent 60%);
}
.tc-root{
  color:var(--ink);min-height:100vh;position:relative;isolation:isolate;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,'Barlow',sans-serif;
  background:var(--grad-base);background-attachment:fixed;
}
.tc-root::before{content:"";position:fixed;inset:-10%;z-index:-1;pointer-events:none;background:var(--blobs);animation:tc-drift 32s ease-in-out infinite alternate;}
.tc-display{font-family:'Barlow Condensed',sans-serif;letter-spacing:.01em;}
.tc-mono{font-family:'IBM Plex Mono',monospace;}
.tc-card{
  position:relative;background:var(--card);border:1px solid var(--glass-stroke);border-radius:26px;
  -webkit-backdrop-filter:blur(26px) saturate(200%);backdrop-filter:blur(26px) saturate(200%);
  box-shadow:var(--glass-sheen),var(--glass-shadow);
}
.tc-card::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;
  background:linear-gradient(180deg,rgba(255,255,255,var(--sheen-a)),rgba(255,255,255,0) 38%,rgba(255,255,255,0) 84%,rgba(255,255,255,calc(var(--sheen-a) * .3))),linear-gradient(115deg,transparent 32%,rgba(255,255,255,var(--sheen-b)) 47%,transparent 64%);
  background-size:100% 100%,260% 260%;background-position:0 0,0% 0%;
  animation:tc-sheen 15s ease-in-out infinite;}
.tc-card > *{position:relative;z-index:1;}
.tc-eyebrow{font-family:'Barlow Condensed';font-weight:600;letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:var(--ink-soft);}
.tc-btn{font-family:'Barlow Condensed';font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:14px;transition:transform .08s ease, background .15s ease, box-shadow .15s ease;}
.tc-btn:active{transform:scale(.98);}
.tc-btn-primary{background:linear-gradient(180deg,#F06636,#E8541E);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 6px 18px rgba(232,84,30,.34);}
.tc-btn-primary:hover{background:linear-gradient(180deg,#EC5826,#D8490F);}
.tc-btn-ghost{background:rgba(255,255,255,.36);-webkit-backdrop-filter:blur(14px) saturate(180%);backdrop-filter:blur(14px) saturate(180%);border:1px solid var(--glass-stroke);color:var(--ink);box-shadow:inset 0 1px 0 rgba(255,255,255,.6);}
.tc-btn-ghost:hover{background:rgba(255,255,255,.55);}
.tc-root.tc-dark .tc-btn-ghost{background:rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.18);}
.tc-root.tc-dark .tc-btn-ghost:hover{background:rgba(255,255,255,.16);}
.tc-input{background:rgba(255,255,255,.42);-webkit-backdrop-filter:blur(10px) saturate(160%);backdrop-filter:blur(10px) saturate(160%);border:1px solid var(--glass-stroke);border-radius:13px;color:var(--ink);box-shadow:inset 0 1px 2px rgba(22,35,56,.07);}
.tc-root.tc-dark .tc-input{background:rgba(255,255,255,.06);box-shadow:inset 0 1px 2px rgba(0,0,0,.25);}
.tc-input:focus{outline:2px solid var(--steel);outline-offset:1px;border-color:rgba(61,107,142,.6);}
.tc-input option{color:#162338;}
*:focus-visible{outline:2px solid var(--steel);outline-offset:2px;border-radius:4px;}
@media (prefers-reduced-motion: reduce){ .tc-btn{transition:none;} .tc-fill{transition:none !important;} .tc-root::before{animation:none;} .tc-card::before{animation:none;} .tc-ring{transition:none;} }
.tc-chip{font-family:'Barlow Condensed';font-weight:600;font-size:12px;letter-spacing:.08em;text-transform:uppercase;border-radius:8px;padding:2px 8px;}
.tc-fill{transition:width .5s ease;}
.tc-ring{transition:stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1), opacity .2s ease, filter .2s ease;}
details.tc-details > summary{list-style:none;cursor:pointer;}
details.tc-details > summary::-webkit-details-marker{display:none;}
@keyframes tc-drift{from{transform:translate3d(0,0,0) scale(1);}to{transform:translate3d(0,-2.5%,0) scale(1.07);}}
@keyframes tc-sheen{0%{background-position:0 0,0% 0%;}50%{background-position:0 0,100% 0%;}100%{background-position:0 0,0% 0%;}}
@keyframes tc-pulse{0%{box-shadow:0 0 0 0 rgba(62,124,89,.55);}70%{box-shadow:0 0 0 6px rgba(62,124,89,0);}100%{box-shadow:0 0 0 0 rgba(62,124,89,0);}}
.tc-live-dot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:tc-pulse 1.8s infinite;}
.tc-you{position:absolute;top:-5px;transform:translateX(-50%);width:18px;height:18px;border-radius:50%;background:var(--ink);border:3px solid rgba(255,255,255,.92);box-shadow:0 0 0 1px var(--ink),0 2px 6px rgba(22,35,56,.3);}
@media (prefers-reduced-motion: reduce){ .tc-live-dot{animation:none;} }
`;

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */
const DAY = 86400000;
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MI = 1609.34; // meters
// Session-RPE/TRIMP-style cost per hour by modality (run = reference 1.0)
const LOAD_W = { swim: 0.7, bike: 0.8, run: 1.0, strength: 0.85 };
// Safe weekly growth of the longest session (h/wk); halved-ish for masters via profile.gs
const GROWTH = { swim: 0.3, bike: 0.5, run: 0.25, strength: 0.4 };
const WEEKLY_GROWTH = 0.5; // h/wk ramp for "weekly volume" benchmarks

/* ----------------------------- Race catalog ----------------------- */
/* family: tri (swim/bike/run + bricks) · run (pure running) · hybrid
   (run + station strength + race-sim compromised running).
   bench: measurable readiness bars — kind 'longest' (single session, h)
   or 'weekly' (avg h/wk over 28d). */
const RACES = {
  full: {
    name: "Ironman-distance", short: "140.6", family: "tri", flavor: "tri",
    legs: "2.4 swim · 112 bike · 26.2 run",
    peakMin: 9, peakMax: 15, taper: 3, minWeeks: 16,
    capBike: 6.0, capRun: 2.75,
    bench: [
      { sport: "swim", kind: "longest", target: 1.2 },
      { sport: "bike", kind: "longest", target: 6.0 },
      { sport: "run", kind: "longest", target: 2.75 },
    ],
  },
  half: {
    name: "Half iron-distance", short: "70.3", family: "tri", flavor: "tri",
    legs: "1.2 swim · 56 bike · 13.1 run",
    peakMin: 6, peakMax: 11, taper: 2, minWeeks: 10,
    capBike: 3.5, capRun: 1.75,
    bench: [
      { sport: "swim", kind: "longest", target: 0.6 },
      { sport: "bike", kind: "longest", target: 3.5 },
      { sport: "run", kind: "longest", target: 1.75 },
    ],
  },
  fivek: {
    name: "5K", short: "5K", family: "run", flavor: "run",
    legs: "5K · speed and VO2max",
    peakMin: 3.5, peakMax: 6, taper: 1, minWeeks: 5,
    capRun: 1.25,
    bench: [
      { sport: "run", kind: "longest", target: 1.25 },
      { sport: "run", kind: "weekly", target: 3.0 },
      { sport: "strength", kind: "weekly", target: 0.5 },
    ],
  },
  tenk: {
    name: "10K", short: "10K", family: "run", flavor: "run",
    legs: "10K · threshold and grit",
    peakMin: 4, peakMax: 7, taper: 1, minWeeks: 7,
    capRun: 1.5,
    bench: [
      { sport: "run", kind: "longest", target: 1.5 },
      { sport: "run", kind: "weekly", target: 3.5 },
      { sport: "strength", kind: "weekly", target: 0.5 },
    ],
  },
  half_marathon: {
    name: "Half marathon", short: "13.1", family: "run", flavor: "run",
    legs: "13.1 mi · even pace, strong close",
    peakMin: 5, peakMax: 9, taper: 2, minWeeks: 10,
    capRun: 2.0,
    bench: [
      { sport: "run", kind: "longest", target: 2.0 },
      { sport: "run", kind: "weekly", target: 4.0 },
      { sport: "strength", kind: "weekly", target: 0.5 },
    ],
  },
  marathon: {
    name: "Marathon", short: "26.2", family: "run", flavor: "run",
    legs: "26.2 mi of honest pacing",
    peakMin: 5, peakMax: 9, taper: 3, minWeeks: 12,
    capRun: 2.75,
    bench: [
      { sport: "run", kind: "longest", target: 2.75 },
      { sport: "run", kind: "weekly", target: 4.5 },
      { sport: "strength", kind: "weekly", target: 0.5 },
    ],
  },
  hyrox: {
    name: "HYROX", short: "HYROX", family: "hybrid", flavor: "hyrox",
    legs: "8×1km run · 8 stations",
    peakMin: 5, peakMax: 9, taper: 1, minWeeks: 8,
    capRun: 1.5,
    bench: [
      { sport: "run", kind: "longest", target: 1.25 },
      { sport: "run", kind: "weekly", target: 2.5 },
      { sport: "strength", kind: "weekly", target: 2.0 },
    ],
  },
  deka: {
    name: "DEKA FIT", short: "DEKA", family: "hybrid", flavor: "deka",
    legs: "5K run · 10 fitness zones",
    peakMin: 4, peakMax: 8, taper: 1, minWeeks: 6,
    capRun: 1.25,
    bench: [
      { sport: "run", kind: "longest", target: 0.9 },
      { sport: "run", kind: "weekly", target: 2.0 },
      { sport: "strength", kind: "weekly", target: 1.5 },
    ],
  },
  spartan_sprint: {
    name: "Spartan Sprint", short: "5K OCR", family: "hybrid", flavor: "spartan",
    legs: "5K · 20 obstacles",
    peakMin: 4, peakMax: 8, taper: 1, minWeeks: 6,
    capRun: 1.25,
    bench: [
      { sport: "run", kind: "longest", target: 1.0 },
      { sport: "run", kind: "weekly", target: 2.0 },
      { sport: "strength", kind: "weekly", target: 1.5 },
    ],
  },
  spartan_beast: {
    name: "Spartan Beast", short: "21K OCR", family: "hybrid", flavor: "spartan",
    legs: "21K · 30 obstacles",
    peakMin: 6, peakMax: 10, taper: 2, minWeeks: 12,
    capRun: 2.5,
    bench: [
      { sport: "run", kind: "longest", target: 2.25 },
      { sport: "run", kind: "weekly", target: 4.0 },
      { sport: "strength", kind: "weekly", target: 2.0 },
    ],
  },
};
const RACE_GROUPS = [
  ["Triathlon", ["full", "half"]],
  ["Running", ["fivek", "tenk", "half_marathon", "marathon"]],
  ["Hybrid & obstacle", ["hyrox", "deka", "spartan_sprint", "spartan_beast"]],
];

const SPORT_META = {
  swim: { label: "SWIM", icon: Waves, bg: "var(--steel-soft)", fg: "var(--steel)" },
  bike: { label: "BIKE", icon: Bike, bg: "var(--orange-soft)", fg: "var(--orange)" },
  run: { label: "RUN", icon: Footprints, bg: "var(--green-soft)", fg: "var(--green)" },
  strength: { label: "STR", icon: Dumbbell, bg: "var(--amber-soft)", fg: "var(--amber)" },
  lift: { label: "LIFT", icon: Dumbbell, bg: "var(--ink)", fg: "#fff" },
  brick: { label: "BRICK", icon: Zap, bg: "linear-gradient(90deg,var(--orange-soft),var(--green-soft))", fg: "var(--ink)" },
  sim: { label: "SIM", icon: Zap, bg: "linear-gradient(90deg,var(--green-soft),var(--amber-soft))", fg: "var(--ink)" },
  rest: { label: "REST", icon: Moon, bg: "rgba(22,35,56,.08)", fg: "var(--ink-soft)" },
  race: { label: "RACE", icon: Flag, bg: "var(--ink)", fg: "#fff" },
};
const PHASE_COLOR = {
  Base: "var(--steel)", Build: "var(--green)", Peak: "var(--orange)",
  Recovery: "var(--amber)", Taper: "var(--steel)", "Race week": "var(--ink)",
};
const TONE = { red: "var(--red)", amber: "var(--amber)", green: "var(--green)", steel: "var(--steel)", ink: "var(--ink-soft)" };

const strip = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const monday = (d) => { const x = strip(d); const g = (x.getDay() + 6) % 7; return addDays(x, -g); };
const key = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const q25 = (x) => Math.round(x * 4) / 4;
function fmtHM(h) {
  if (h == null) return "—";
  const t = Math.round(h * 60); const H = Math.floor(t / 60), M = t % 60;
  return H ? (M ? H + "h " + M + "m" : H + "h") : M + "m";
}
function fmtClock(hours) {
  const s = Math.round(hours * 3600);
  const H = Math.floor(s / 3600), M = Math.floor((s % 3600) / 60), S = s % 60;
  return H ? H + ":" + String(M).padStart(2, "0") + ":" + String(S).padStart(2, "0")
    : M + ":" + String(S).padStart(2, "0");
}
function parseDur(t) {
  if (!t) return 0;
  const p = String(t).trim().split(":").map(Number);
  if (p.some(isNaN) || !p.length) return 0;
  if (p.length === 3) return p[0] + p[1] / 60 + p[2] / 3600;
  if (p.length === 2) return p[0] / 60 + p[1] / 3600;
  return 0;
}
function classify(typeStr) {
  const s = String(typeStr || "").toLowerCase();
  if (/swim/.test(s)) return "swim";
  if (/cycl|bik|ride/.test(s)) return "bike";
  if (/run|treadmill/.test(s) && !/strength/.test(s)) return "run";
  if (/strength|core|pilates|crossfit|functional|weight|hiit|circuit/.test(s)) return "strength";
  return null;
}

/* ------------------------------------------------------------------ */
/*  Profile — published physiology, applied                            */
/* ------------------------------------------------------------------ */
function profileOf(s) {
  const age = +s.age || null;
  const maxHR = age ? Math.round(208 - 0.7 * age) : null; // Tanaka et al. 2001
  const rhr = +s.rhr || null;
  const z2 = maxHR ? [Math.round(maxHR * 0.68), Math.round(maxHR * 0.78)] : null;
  const z45 = maxHR ? [Math.round(maxHR * 0.9), Math.round(maxHR * 0.95)] : null; // VO2max work
  const wkg = s.weight ? (s.wUnit === "lb" ? s.weight * 0.4536 : +s.weight) : null;
  const carbs = wkg ? Math.min(90, Math.max(40, Math.round((wkg * 0.8) / 5) * 5)) : null; // Jeukendrup 2014 band
  const fluid = wkg ? Math.round((wkg * 9) / 50) * 50 : null;
  const masters = age != null && age >= 40;
  const gs = age >= 50 ? 0.85 : age >= 40 ? 0.9 : 1;
  return { age, maxHR, rhr, z2, z45, carbs, fluid, masters, gs, wkg, sex: s.sex || null };
}

/* ------------------------------------------------------------------ */
/*  VO2max engine — Daniels & Gilbert VDOT from real runs              */
/* ------------------------------------------------------------------ */
/* For a run of distance d (mi) in time t (min):
   velocity v = d·1609.34/t (m/min)
   oxygen cost      VO2(v)   = −4.60 + 0.182258·v + 0.000104·v²        (Daniels & Gilbert)
   fraction usable  %VO2max(t) = 0.8 + 0.1894393·e^(−0.012778·t) + 0.2989558·e^(−0.1932605·t)
   VDOT = VO2(v) / %VO2max(t)                                          */
function vdotOfRun(distMi, hours) {
  const t = hours * 60;
  if (!distMi || distMi < 1 || t < 10 || t > 300) return null;
  const v = (distMi * MI) / t;
  if (v < 100 || v > 420) return null; // outside ~16:00–3:50 /mi — bad data
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / pct;
}
/* Riegel (1981): T2 = T1 · (D2/D1)^1.06 */
function riegel(d1Mi, t1Hours, d2Mi) { return t1Hours * Math.pow(d2Mi / d1Mi, 1.06); }

function fitnessRating(vo2, age, sex) {
  if (!vo2 || !age) return null;
  // Coarse ACSM/Cooper-style bands, centered per decade; honest "approx." labelling in UI.
  const base = (sex === "F" ? 41 : sex === "M" ? 49 : 45) - Math.max(0, (age - 25) / 10) * 3.5;
  const d = vo2 - base;
  if (d >= 8) return { label: "Excellent", tone: "green" };
  if (d >= 3) return { label: "Good", tone: "green" };
  if (d >= -2) return { label: "Average", tone: "steel" };
  if (d >= -7) return { label: "Below average", tone: "amber" };
  return { label: "Needs base work", tone: "amber" };
}

function vo2Read(activities, P) {
  const today = strip(new Date());
  const cut = key(addDays(today, -119));
  const runs = activities.filter((a) => a.sport === "run" && a.key >= cut && a.distMi);
  const points = runs
    .map((a) => ({ key: a.key, vdot: vdotOfRun(a.distMi, a.hours), distMi: a.distMi, hours: a.hours, avgHR: a.avgHR }))
    .filter((p) => p.vdot && p.vdot > 20 && p.vdot < 85)
    .sort((a, b) => (a.key < b.key ? -1 : 1));
  if (!points.length) return null;

  const best = points.reduce((a, b) => (b.vdot > a.vdot ? b : a));

  // Secondary estimate: VO2-at-pace ÷ fraction of heart-rate reserve (Swain: %HRR ≈ %VO2R)
  let hrEst = null;
  if (P && P.maxHR) {
    const rhr = P.rhr || 60;
    const ests = points
      .filter((p) => p.avgHR && p.avgHR > rhr + 15 && p.avgHR < P.maxHR)
      .map((p) => {
        const v = (p.distMi * MI) / (p.hours * 60);
        const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
        const frac = (p.avgHR - rhr) / (P.maxHR - rhr);
        return frac > 0.45 && frac <= 1 ? Math.min(85, vo2 / frac + 3.5) : null; // +3.5 ≈ resting VO2 back in
      })
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (ests.length >= 3) hrEst = ests[Math.floor(ests.length / 2)];
  }

  const vdot = Math.round(best.vdot * 10) / 10;
  const preds = [["5K", 3.107], ["10K", 6.214], ["Half", 13.109], ["Marathon", 26.219]]
    .map(([label, d]) => ({ label, time: riegel(best.distMi, best.hours, d) }));
  const trend = points.map((p) => ({ label: fmtDate(new Date(p.key + "T12:00:00")), VDOT: Math.round(p.vdot * 10) / 10 }));
  const rating = fitnessRating(vdot, P?.age, P?.sex);
  return { vdot, hrEst: hrEst ? Math.round(hrEst * 10) / 10 : null, best, preds, trend, rating,
    extrapolated: best.distMi < 3, n: points.length };
}

/* ------------------------------------------------------------------ */
/*  The science — what the engine does, and the paper it leans on      */
/* ------------------------------------------------------------------ */
const SCIENCE = [
  ["Polarized 80/20 intensity", "Easy sessions are pinned below your Z2 ceiling; ~1 hard session per week plus the long one. Elite endurance training clusters ~80% easy / ~20% hard.", "Seiler & Tønnessen 2009; Stöggl & Sperlich 2014"],
  ["Acute:chronic workload (readiness)", "7-day load vs 28-day load, sport-weighted. The 0.8–1.3 band is the injury-risk sweet spot; the app auto-trims your week above it.", "Gabbett 2016, BJSM; Hulin et al. 2014"],
  ["Progressive overload with tissue caps", "Long sessions grow ≤ +15–30 min/wk (slower 40+). Aerobic fitness adapts in weeks; tendon and bone on a slower clock.", "10% guideline; Bohm et al. 2015 (tendon adaptation)"],
  ["Evidence-based taper", "1–3 weeks, volume cut 40–60%, intensity and frequency maintained — the protocol with the strongest performance effect in meta-analysis.", "Mujika & Padilla 2003; Bosquet et al. 2007"],
  ["Heart-rate anchors", "Max HR estimated as 208 − 0.7×age; zones as %HRmax. A field test beats any formula — replace the estimate when you have one.", "Tanaka et al. 2001"],
  ["Fueling long work", "Sessions >90 min: carbs scaled to you (~0.8 g/kg/hr, 40–90 g/hr); >2.5 h favors multiple transportable carbohydrates. The gut is trainable.", "Jeukendrup 2014"],
  ["VO2max: measured by performance", "VDOT computes aerobic power from your actual race-effort runs (oxygen cost of pace ÷ usable fraction for the duration). To raise it: ~4×4 min @ 90–95% HRmax.", "Daniels & Gilbert 1979; Helgerud et al. 2007"],
  ["Strength makes endurance cheaper", "Heavy/explosive strength work improves running and cycling economy without adding bulk — why even the marathon plan keeps a strength slot.", "Rønnestad & Mujika 2014"],
  ["Lifting + endurance (concurrent training)", "Lifting mode protects your gym work but stacks it onto already-hard days and keeps heavy leg work off the day before key runs — so the two adaptations interfere as little as possible. Volume tapers as the race nears.", "Hickson 1980; Coffey & Hawley 2017; Fyfe et al. 2014"],
  ["Sleep is your biggest recovery lever", "Aim for 8–10 h in bed — most muscle repair, glycogen resynthesis and growth-hormone release happen in deep sleep. Extending college athletes to ~10 h in bed (≈+1 h sleep) for 5–7 weeks made them measurably faster on sprints, quicker on reaction time, and lifted mood. Bank sleep like a key session.", "Mah et al. 2011, SLEEP; Walsh et al. 2021, BJSM consensus"],
  ["Under-sleep taxes endurance — and invites injury", "Skimp and the same watts feel harder: sleep loss raises perceived effort and trims time-to-exhaustion (~10%+) in long efforts. Chronically under ~8 h/night is linked to about 1.7× the injury risk. Fix sleep before you add training load.", "Roberts et al. 2019, BJSM (meta-analysis); Milewski et al. 2014, J Pediatr Orthop"],
  ["You adapt on the rest day, not in the session", "Training is only the stimulus — mitochondria, capillaries and glycogen rebuild during recovery (super-compensation), so a skipped rest day stalls the gains it was meant to bank. Rough 'fully recovered' guide: easy run ~24 h, hard intervals 48–72 h, a race or very long day up to a week.", "Bishop et al. 2008 (recovery review); super-compensation model"],
  ["Rest-day playbook — recover on purpose", "Make rest active: keep movement to Z1 (a 20–30 min walk or easy spin flushes blood without adding load), refill with carbs + ~0.3 g/kg protein, hydrate, and protect sleep. A 20–30 min nap (early afternoon, leaving ~30 min to shake off grogginess before any effort) restores power and focus and tops up night sleep.", "Dattilo et al. 2011; Lastella et al. 2021 (napping review)"],
];

/* ------------------------------------------------------------------ */
/*  Pro standards — Olympic-grade benchmarks, broken into rungs        */
/*  Numbers anchored to current records & sports-science norms.        */
/* ------------------------------------------------------------------ */
const TIER_LABELS = ["First steps", "Recreational", "Competitive amateur", "Regional / sub-elite", "Elite / Olympic"];

// Aerobic engine. Distance-sport reference; Olympic runners 70–85, human ceiling ~96 (XC skiing).
function vo2Ladder(sex) {
  return {
    metric: "Aerobic engine", sub: "VO2max, ml/kg/min", higher: true,
    vals: sex === "F" ? [32, 40, 48, 56, 66] : [38, 46, 54, 63, 75],
    fmt: (v) => v.toFixed(0),
    habit: "1–2 quality sessions/wk (4×4min @ 90–95% HRmax) sitting on a wide easy base.",
    elite: "Olympic distance runners measure 70–85; the highest ever recorded is ~96.",
  };
}
// 5K time (minutes). Elite men ~12:35–13:30, women ~14:00–15:00.
const FIVEK_LADDER = {
  metric: "5K time", sub: "flat-out", higher: false,
  vals: [34, 27, 22, 18, 14],
  fmt: (m) => fmtClock(m / 60),
  habit: "Weekly intervals at ~5K effort (e.g. 5×1km), and race one occasionally to recalibrate.",
  elite: "World-class 5K is ~12:35 (men) / ~14:00 (women) — about 2:30/km, held for 5km.",
};
// Race-specific headline spec for the reference card (vivid, current).
function eliteSpec(raceType) {
  const m = {
    full: { line: "Ironman pros go ~7:35–8:00: a ~48min swim, a 112-mile bike held above 5 W/kg, then a sub-2:50 marathon — off the bike.", facts: ["Swim ~1:15/100yd for 2.4 miles", "Bike normalized power ~5+ W/kg for 4+ hours", "Run a 2:45–2:55 marathon on tired legs"] },
    half: { line: "70.3 pros finish ~3:35–3:50: ~23min swim, ~2:05 bike, ~1:10 run — every discipline sharp, none a weakness.", facts: ["Swim 1.2mi ~22–24min", "Bike 56mi at ~5 W/kg", "Run 13.1mi ~1:10 off the bike"] },
    marathon: { line: "The marathon just broke 2 hours: Sawe ran 1:59:30 in London 2026; the women's record is 2:09:56.", facts: ["Elite pace ~2:50/km for 42.2km", "Pros log 100–140 miles/week", "VO2max 70–85, fuelling 90–120g carbs/hr"] },
    half_marathon: { line: "Elite half-marathoners hold ~2:43/km for 13.1 miles — the men's world record is 57:20 (Kiplimo, 2026), the women's 1:02:52 (Gidey).", facts: ["Threshold pace ~2:43/km held 21km", "Huge lactate threshold + VO2max 70–80", "90–120 mile weeks, two quality days"] },
    tenk: { line: "Elite 10K road racing is pure speed-endurance: Kejelcha ran 26:31 (2025) — about 2:39/km, held for 6.2 miles.", facts: ["~2:39/km (men) / ~2:53/km (women)", "Sky-high VO2max and economy", "Track reps: 5×1km, 200m floats"] },
    fivek: { line: "Elite 5K is near-track speed on the road: men run under 13:00 (~2:35/km), women ~14:15 — fully redlined at VO2max.", facts: ["~2:35/km (men) held 5km", "Run at 95–100% of VO2max", "Reps: 5×1km / 10×400m at race pace"] },
    hyrox: { line: "HYROX pros finish ~52–55min: Rončević 51:59, Wietrzyk 54:25 (2026) — running 8×1km near 3:30–3:45/km between eight stations.", facts: ["Sub-4:00/km running while pre-fatigued", "Sled push/pull moving heavy loads fast", "1000m row + ski erg without redlining"] },
    deka: { line: "DEKA elites blend a fast 5K with ten power zones — relentless transitions, no wasted seconds, FIT times near the 30-min mark.", facts: ["5K close to 18–20min between zones", "Strength-endurance under a ticking clock", "Transitions treated as part of the race"] },
    spartan_sprint: { line: "Elite OCR racers run a 5K trail near 20min and clear 20 obstacles barely breaking stride — grip and carries cost them nothing.", facts: ["Sub-7:00/mi on technical terrain", "Dead-hang grip that outlasts the course", "Heavy carries at near-running pace"] },
    spartan_beast: { line: "Beast-distance elites cover 21K of mountain with 30 obstacles in ~2–2.5h — climbing legs, climbing lungs, unbreakable grip.", facts: ["Strong on long climbs at altitude", "Grip endurance over 3+ hours", "Run the flats, power the hills"] },
  };
  return m[raceType] || m.marathon;
}
function ladderPlace(value, L) {
  const v = L.vals;
  if (value == null) return null;
  // position 0..100 across the 5 rungs, plus current tier index
  let pos, tier = 0;
  if (L.higher) {
    if (value <= v[0]) pos = (value / v[0]) * 12.5;
    else if (value >= v[4]) { pos = 100; tier = 4; }
    else for (let i = 0; i < 4; i++) if (value >= v[i] && value < v[i + 1]) { tier = i; pos = (i + (value - v[i]) / (v[i + 1] - v[i])) * 25; break; }
    if (value >= v[4]) tier = 4;
  } else { // lower is better
    if (value >= v[0]) pos = Math.max(2, 12.5 - ((value - v[0]) / v[0]) * 12.5);
    else if (value <= v[4]) { pos = 100; tier = 4; }
    else for (let i = 0; i < 4; i++) if (value <= v[i] && value > v[i + 1]) { tier = i; pos = (i + (v[i] - value) / (v[i] - v[i + 1])) * 25; break; }
    if (value <= v[4]) tier = 4;
  }
  const nextIdx = Math.min(4, tier + 1);
  return { pos: Math.max(2, Math.min(100, pos)), tier, atTop: tier >= 4, nextVal: v[nextIdx], nextLabel: TIER_LABELS[nextIdx] };
}

/* ------------------------------------------------------------------ */
/*  Session library — family-aware, science-annotated                  */
/* ------------------------------------------------------------------ */
function sessionSub(slot, phase, P, cfg) {
  const z2s = P && P.z2 ? " · Z2 " + P.z2[0] + "–" + P.z2[1] + "bpm" : "";
  const z45 = P && P.z45 ? P.z45[0] + "–" + P.z45[1] + "bpm" : "90–95% HRmax";
  const fuel = P && P.carbs ? "~" + P.carbs + "g carbs/hr" : "60–90g carbs/hr";
  const fl = cfg.flavor;
  const station = fl === "spartan"
    ? "Grip, carries, pulls: hangs, farmer carry, sandbag, rope/ring rows"
    : "Stations: sled push/pull, erg, lunges, wall balls — crisp reps";
  const lib = {
    swim: { Base: "Drills + steady 200s · technique first", Build: "Main set 8–10×100 strong",
      Peak: "Race-pace 400s · open water if you can", Recovery: "Easy technique swim", Taper: "Short + a few race starts" },
    bikeQ: { Base: "Z2 + high-cadence spins" + z2s, Build: "3×10min @ race effort",
      Peak: "2×20min @ goal race effort", Recovery: "Easy spin", Taper: "Short + 4×1min openers" },
    runQ: { Base: "Strides + hills: 8×20s quick, full recovery", Build: "4×4min @ " + z45 + ", 3min jog — VO2max (Helgerud)",
      Peak: "3×8min @ race effort, 2min jog", Recovery: "Easy + 4 strides", Taper: "4×2min openers @ race effort" },
    runE: { Base: "Z2 conversational" + z2s + " — 80/20 base", Build: "Z2 + 4 strides" + z2s,
      Peak: "Z2, genuinely easy" + z2s, Recovery: "Very easy, walk breaks fine", Taper: "Easy shakeout" },
    strength: { Base: station + " · 2–4 sets, leave reps in reserve", Build: station + " · race-weight reps",
      Peak: (fl === "tri" || fl === "run" ? "Heavy + explosive, low volume — economy work (Rønnestad)" : station + " · race pace, race standards"),
      Recovery: "Light circuit, mobility", Taper: "Light, fast, brief — stay sharp" },
    sim: { Base: "3 rds: 800m run + 2 stations, smooth", Build: "4–5 rds: 1km run + station @ race effort — compromised running",
      Peak: "Race simulation: 5–6 rds @ goal pace, full standards", Recovery: "2 easy rounds, technique focus", Taper: "2 quick rounds, openers only" },
    longBike: { Base: "Z2 steady · practice fueling" + z2s, Build: "Z2 · " + fuel + " · aero time",
      Peak: "Race-effort blocks · " + fuel + (P && P.fluid ? " · ~" + P.fluid + "ml/hr" : ""), Recovery: "Z2, shorter", Taper: "Easy with openers" },
    longRun: { Base: "Z2 conversational" + z2s, Build: "Z2 · fuel " + fuel + " past 90min",
      Peak: (cfg.family === "run" ? "Z2 + final 20–30min @ race effort" : "Z2 + race-effort finish"),
      Recovery: "Short and easy", Taper: "Easy, on fresh legs" },
  };
  return (lib[slot] && (lib[slot][phase] || lib[slot].Base)) || "Z2 effort";
}

/* ----------------------------- Templates --------------------------- */
function weekTemplate(cfg, daysPerWeek, weakest) {
  if (cfg.family === "tri") {
    const flex = weakest === "swim"
      ? { slot: "swim", title: "Swim #2", sports: ["swim"] }
      : weakest === "bike"
        ? { slot: "bikeQ", title: "Trainer spin", sports: ["bike"] }
        : { slot: "runE", title: "Easy run", sports: ["run"] };
    const T = {
      4: [null, { slot: "double", title: "Swim + run", sports: ["swim", "run"] }, { slot: "bikeQ", title: "Bike quality", sports: ["bike"] }, null, null, { slot: "longBike", title: "Long ride", sports: ["bike"] }, { slot: "longRun", title: "Long run", sports: ["run"] }],
      5: [null, { slot: "swim", title: "Swim", sports: ["swim"] }, { slot: "bikeQ", title: "Bike quality", sports: ["bike"] }, flex, null, { slot: "longBike", title: "Long ride", sports: ["bike"] }, { slot: "longRun", title: "Long run", sports: ["run"] }],
      6: [null, { slot: "swim", title: "Swim", sports: ["swim"] }, { slot: "bikeQ", title: "Bike quality", sports: ["bike"] }, { slot: "runE", title: "Easy run", sports: ["run"] }, flex, { slot: "longBike", title: "Long ride", sports: ["bike"] }, { slot: "longRun", title: "Long run", sports: ["run"] }],
      7: [{ slot: "runE", title: "Recovery run", sports: ["run"] }, { slot: "swim", title: "Swim", sports: ["swim"] }, { slot: "bikeQ", title: "Bike quality", sports: ["bike"] }, { slot: "runE", title: "Easy run", sports: ["run"] }, flex, { slot: "longBike", title: "Long ride", sports: ["bike"] }, { slot: "longRun", title: "Long run", sports: ["run"] }],
    };
    return T[daysPerWeek] || T[5];
  }
  const Q = { slot: "runQ", title: "Run quality", sports: ["run"] };
  const E = { slot: "runE", title: "Easy run", sports: ["run"] };
  const S = { slot: "strength", title: cfg.family === "hybrid" ? "Stations" : "Strength", sports: ["strength"] };
  const M = { slot: "sim", title: "Race sim", sports: ["run", "strength"] };
  const L = { slot: "longRun", title: "Long run", sports: ["run"] };
  if (cfg.family === "run") {
    const T = {
      4: [null, Q, null, S, null, E, L],
      5: [null, Q, E, S, null, E, L],
      6: [E, Q, null, E, S, E, L],
      7: [E, Q, E, E, S, E, L],
    };
    return T[daysPerWeek] || T[5];
  }
  // hybrid: HYROX / DEKA / Spartan
  const T = {
    4: [null, Q, null, S, null, M, L],
    5: [null, Q, S, E, null, M, L],
    6: [S, Q, E, S, null, M, L],
    7: [E, Q, S, E, S, M, L],
  };
  return T[daysPerWeek] || T[5];
}

/* ------------------------------------------------------------------ */
/*  Plan generation — hours-based, capped, family-aware                */
/* ------------------------------------------------------------------ */
function generatePlan(s) {
  const cfg = RACES[s.raceType];
  const P = profileOf(s);
  const today = strip(new Date());
  const race = strip(new Date(s.raceDate + "T12:00:00"));
  const w0 = monday(today);
  const totalWeeks = Math.round((monday(race) - w0) / (7 * DAY)) + 1;
  if (totalWeeks < 1) return null;

  const start = Math.max(2.5, s.weeklyHours);
  const peak = Math.min(cfg.peakMax, Math.max(cfg.peakMin, Math.max(start + 2.5, Math.round(start * (totalWeeks >= cfg.minWeeks ? 1.6 : 1.35) * 2) / 2)));
  const taperLen = totalWeeks >= cfg.minWeeks ? cfg.taper : Math.min(cfg.taper, 1);
  const rampLen = Math.max(1, totalWeeks - taperLen);
  const cutEvery = P.masters ? 3 : 4;
  let prevLB = cfg.capBike ? Math.max(1.5, start * 0.3) : null;
  let prevLR = Math.max(0.75, start * (cfg.family === "tri" ? 0.18 : 0.28));

  const weeks = [];
  for (let i = 0; i < totalWeeks; i++) {
    const wStart = addDays(w0, i * 7);
    const wtr = totalWeeks - i;
    let phase, target;
    if (wtr === 1) { phase = "Race week"; target = q25(peak * 0.35); }
    else if (wtr <= taperLen) { phase = "Taper"; target = q25(peak * (wtr === 2 ? 0.55 : 0.72)); } // Mujika: −40–60% volume
    else {
      const t = rampLen <= 1 ? 1 : i / (rampLen - 1);
      target = q25(start + (peak - start) * Math.min(1, t));
      if ((i + 1) % cutEvery === cutEvery - 1 && i < rampLen - 1 && i > 0) { phase = "Recovery"; target = q25(target * 0.7); }
      else phase = i < Math.floor(rampLen * 0.4) ? "Base" : (wtr <= taperLen + 4 ? "Peak" : "Build");
    }

    let longBike = null, longRun = null;
    if (phase === "Race week") { /* none */ }
    else if (phase === "Taper") {
      longBike = cfg.capBike ? (wtr === 2 ? 1.5 : 2.25) : null;
      longRun = Math.min(cfg.capRun, wtr === 2 ? Math.max(0.75, cfg.capRun * 0.4) : Math.max(1, cfg.capRun * 0.55));
    } else {
      if (cfg.capBike) {
        longBike = q25(Math.min(target * 0.34, cfg.capBike, prevLB + GROWTH.bike * P.gs));
        if (phase === "Recovery") longBike = q25(longBike * 0.75); else prevLB = Math.max(prevLB, longBike);
      }
      const lrShare = cfg.family === "tri" ? 0.22 : cfg.family === "run" ? 0.32 : 0.24;
      longRun = q25(Math.min(target * lrShare, cfg.capRun, prevLR + GROWTH.run * P.gs));
      if (phase === "Recovery") longRun = q25(longRun * 0.75); else prevLR = Math.max(prevLR, longRun);
    }
    const brick = cfg.family === "tri" && (phase === "Build" || phase === "Peak") && i % 2 === 1 ? 0.4 : 0;

    weeks.push({
      i, start: wStart, phase, target, longBike, longRun, brick,
      days: buildDays(wStart, phase, target, longBike, longRun, brick, s, race, cfg, P),
    });
  }
  return { weeks, totalWeeks, peak, race, today, cfg, P };
}

/* Rest days earn their keep: active recovery aids adaptation more than doing
   nothing (light movement, mobility, sleep). Rotated so they don't get stale;
   recovery weeks and masters lean toward true rest and sleep. */
const REST_MENU = [
  { t: "Active recovery", s: "Easy 20–30min walk — gentle blood flow, zero training load." },
  { t: "Mobility", s: "15min mobility + foam roll: hips, calves, T-spine. Keeps the next session clean." },
  { t: "Restore", s: "20min easy yoga or a stretch flow — downshift the nervous system." },
  { t: "Sleep is the session", s: "Protect 8h tonight — adaptation is banked while you sleep, not while you train." },
  { t: "Flush", s: "Optional 20–30min Z1 spin or easy swim — loosen the legs, no intensity." },
  { t: "Full rest", s: "Nothing today. Feet up, eat well. This is where the work becomes fitness." },
];
function restRec(seed, phase, P, s) {
  if (phase === "Recovery" || phase === "Taper") return seed % 2 ? REST_MENU[3] : REST_MENU[5]; // sleep / full rest
  const pick = REST_MENU[seed % REST_MENU.length];
  if (s && s.lifts && pick.t === "Mobility") return { t: "Mobility", s: "15min mobility — open hips and ankles so your next lift moves clean." };
  if (P && P.masters && pick.t === "Flush") return REST_MENU[3]; // masters: bias to sleep over extra movement
  return pick;
}

/* Concurrent strength (the gym, not race stations). Protects the user's lifts
   while respecting the interference effect: heavy lower-body work is kept off
   the day before key endurance, and lifts are stacked onto already-hard days
   so easy days stay easy (Coffey & Hawley 2017; Fyfe et al. 2014). */
function liftDose(phase) {
  return ({ Base: 0.75, Build: 0.75, Peak: 0.5, Recovery: 0.5, Taper: 0.3 })[phase] || 0.5;
}
function liftText(phase, focus) {
  const move = focus === "lower" ? "squat, hinge/deadlift, split squats"
    : focus === "upper" ? "press, pull-ups, rows"
    : "squat + hinge + press + pull (compound)";
  const rx = {
    Base: "3×6–8 controlled, ~2 reps in reserve — build the base",
    Build: "4×3–5 heavy, full rests — strength & running economy (Rønnestad)",
    Peak: "2×3–4 heavy, low volume — maintain the gains, spare the legs",
    Recovery: "2×6 light — movement quality only",
    Taper: "1–2 crisp sets, light — sharp not sore",
  }[phase] || "3×5 moderate";
  return move + " · " + rx;
}
function attachLifting(days, phase, s, P) {
  if (!s.lifts) return days;
  const want = phase === "Taper" ? 1 : (phase === "Peak" || phase === "Recovery") ? Math.max(1, (s.liftDays || 2) - 1) : (s.liftDays || 2);
  const dur = liftDose(phase) * (P && P.masters ? 0.85 : 1);
  const focusSeq = (s.liftFocus === "lower" ? ["lower", "upper", "full"]
    : s.liftFocus === "upper" ? ["upper", "lower", "full"]
      : ["full", "lower", "upper"]).slice(0, Math.max(1, want));
  // days that sit immediately before a long run — no heavy lower/full lift here
  const preLong = new Set();
  days.forEach((d, i) => { if (d.anchor === "longRun" && i > 0) preLong.add(i - 1); });
  const isQuality = (d) => d.slot === "runQ" || d.type === "brick" || d.slot === "bikeQ";
  const isEasy = (d) => d.slot === "runE" || d.slot === "swim";
  // priority: convert generic strength/stations slot → stack on a hard day → stack on an easy day
  const order = [
    ...days.map((d, i) => ({ i, d })).filter((x) => x.d.slot === "strength"),
    ...days.map((d, i) => ({ i, d })).filter((x) => isQuality(x.d)),
    ...days.map((d, i) => ({ i, d })).filter((x) => isEasy(x.d)),
  ];
  let fi = 0;
  for (const { i, d } of order) {
    if (fi >= focusSeq.length) break;
    let focus = focusSeq[fi];
    if (preLong.has(i)) { if (focus !== "upper") focus = "upper"; } // protect tomorrow's long run
    const sub = liftText(phase, focus);
    if (d.slot === "strength") {
      days[i] = { ...d, type: "lift", slot: "lift", sports: ["strength"], hours: Math.max(d.hours || 0, q25(dur)),
        title: "Lift — " + focus, sub };
    } else {
      days[i] = { ...d, hours: q25((d.hours || 0) + dur), lift: { focus, sub } };
    }
    fi++;
  }
  return days;
}

function buildDays(wStart, phase, target, longBike, longRun, brick, s, race, cfg, P) {
  const days = [];
  if (phase === "Race week") {
    for (let d = 0; d < 7; d++) {
      const date = addDays(wStart, d);
      const gap = Math.round((race - date) / DAY);
      if (gap === 0) days.push({ date, type: "race", sports: cfg.family === "tri" ? ["swim", "bike", "run"] : ["run", "strength"], hours: null, title: "Race day", sub: cfg.legs + (P && P.carbs && (cfg.family === "tri" || cfg.capRun >= 2) ? " · " + P.carbs + "g/hr from the gun" : " — steady early, brave late") });
      else if (gap === 5 && gap > 0) days.push(cfg.family === "tri"
        ? { date, type: "swim", sports: ["swim"], hours: 0.5, title: "Swim", sub: "Easy loosen-up" }
        : { date, type: "run", sports: ["run"], hours: 0.5, title: "Easy run", sub: "30min Z2 + 4 strides" });
      else if (gap === 3 && gap > 0) days.push(cfg.family === "tri"
        ? { date, type: "bike", sports: ["bike"], hours: 0.6, title: "Spin + openers", sub: "30–40min easy · 4×1min race effort" }
        : { date, type: cfg.family === "hybrid" ? "sim" : "run", sports: cfg.family === "hybrid" ? ["run", "strength"] : ["run"], hours: 0.5, title: "Openers", sub: cfg.family === "hybrid" ? "2 quick rounds @ race effort, stop fresh" : "4×2min @ race effort" });
      else if (gap === 1 && gap > 0) days.push({ date, type: cfg.family === "tri" ? "swim" : "run", sports: [cfg.family === "tri" ? "swim" : "run"], hours: 0.25, title: "Shakeout", sub: "10–15min · gear check · early night" });
      else days.push({ date, type: "rest", sports: [], hours: 0, title: gap < 0 ? "Celebrate" : "Rest", sub: gap < 0 ? "Recover. Eat. Celebrate." : "Short easy walk + light stretch · legs up · carbs in" });
    }
    return days;
  }

  const capH = (s.capMin || 60) / 60;
  const wkSeed = Math.round(wStart.getTime() / (7 * DAY));
  const tpl = weekTemplate(cfg, s.daysPerWeek, s.weakest);
  const weekdaySlots = tpl.filter((t, d) => t && d < 5);
  const simH = tpl.some((t) => t && t.slot === "sim") ? Math.max(0.75, q25(Math.min(1.25, target * 0.18))) : 0;
  const fixed = (longBike || 0) + (longRun || 0) + brick + simH;
  const rem = Math.max(0, target - fixed);
  const weights = { swim: 0.9, bikeQ: 1.2, runQ: 0.9, runE: 0.7, strength: 1.0, double: 1.4 };
  const wSum = weekdaySlots.reduce((a, t) => a + (weights[t.slot] || 0.9), 0) || 1;

  let deficit = 0;
  const wkHours = {};
  weekdaySlots.forEach((t, idx) => {
    const raw = Math.max(0.5, q25(rem * ((weights[t.slot] || 0.9) / wSum)));
    const cap = t.slot === "double" ? Math.min(1.75, 2 * capH) : Math.min(1.5, capH);
    const hrs = Math.min(raw, cap);
    deficit += Math.max(0, raw - hrs);
    wkHours[idx] = hrs;
  });
  let lb = longBike, lr = longRun;
  if (deficit > 0 && lb != null) { const add = q25(Math.min(deficit * 0.6, cfg.capBike - lb)); lb = q25(lb + Math.max(0, add)); deficit -= add; }
  if (deficit > 0 && lr != null) { const add = q25(Math.min(deficit * 0.5, cfg.capRun - lr)); lr = q25(lr + Math.max(0, add)); }

  let wi = 0;
  for (let d = 0; d < 7; d++) {
    const date = addDays(wStart, d);
    const t = tpl[d];
    if (!t) { const r = restRec(wkSeed + d, phase, P, s); days.push({ date, type: "rest", sports: [], hours: 0, title: r.t, sub: r.s }); continue; }
    if (t.slot === "longBike") {
      const isBrick = brick > 0;
      days.push({
        date, type: isBrick ? "brick" : "bike", sports: isBrick ? ["bike", "run"] : ["bike"],
        hours: q25((lb || 0) + brick), title: isBrick ? "Long ride + brick" : "Long ride",
        sub: isBrick ? fmtHM(lb) + " ride → " + Math.round(brick * 60) + "min run off the bike · race fueling" : sessionSub("longBike", phase, P, cfg),
        anchor: "longBike",
      });
    } else if (t.slot === "longRun") {
      days.push({ date, type: "run", sports: ["run"], hours: lr, title: "Long run", sub: sessionSub("longRun", phase, P, cfg), anchor: "longRun" });
    } else if (t.slot === "sim") {
      days.push({ date, type: "sim", sports: ["run", "strength"], hours: simH, title: "Race sim", sub: sessionSub("sim", phase, P, cfg), anchor: "sim" });
    } else {
      const hrs = wkHours[wi]; wi++;
      const type = t.slot === "double" ? "brick" : t.sports[0];
      const sub = t.slot === "double"
        ? fmtHM(Math.max(0.5, q25(hrs * 0.55))) + " swim AM · " + fmtHM(Math.max(0.25, q25(hrs * 0.45))) + " run PM"
        : sessionSub(t.slot, phase, P, cfg);
      days.push({ date, type, sports: t.sports, hours: hrs, title: t.title, sub, slot: t.slot });
    }
  }
  return attachLifting(days, phase, s, P);
}

/* ------------------------------------------------------------------ */
/*  Week modes — the busy-professional escape hatches                  */
/* ------------------------------------------------------------------ */
function applyWeekMode(days, mode) {
  if (!mode || mode === "normal") return { days, note: null };
  if (mode === "slammed") {
    let keptLong = false, keptKey = false, keptShort = false;
    const out = days.map((d) => {
      if (d.type === "race") return d;
      if ((d.anchor === "longBike" || d.anchor === "longRun") && !keptLong) { keptLong = true; return d; }
      if ((d.anchor === "sim" || d.sports.includes("swim") || d.type === "strength" || d.type === "lift") && !keptKey && d.type !== "brick") {
        keptKey = true; return { ...d, hours: Math.min(d.hours || 0.75, 0.75), sub: d.type === "lift" ? "One heavy session — 3 hard sets, in and out" : "30–45min — keep the pattern alive" };
      }
      if (d.sports.includes("run") && !keptShort && !d.anchor) { keptShort = true; return { ...d, hours: 0.4, title: "Short run", sub: "20–25min + 4 strides" }; }
      if (d.type === "rest") return d;
      return { ...d, type: "rest", sports: [], hours: 0, title: "Rest", sub: "Protected — minimum effective dose" };
    });
    return { days: out, note: "Slammed week: one long session, one key session, one short run. Consistency over completeness." };
  }
  if (mode === "travel") {
    let keptRun = false;
    const out = days.map((d) => {
      if (d.type === "race") return d;
      if (d.anchor === "longRun") { keptRun = true; return { ...d, sub: "Z2 — explore the city on foot" }; }
      if (d.anchor === "longBike") return { ...d, type: "run", sports: ["run"], hours: 0.75, title: "Travel long run", sub: "45min Z2 — replaces the ride this week", anchor: "longRun" };
      if (d.type === "lift") return { ...d, hours: Math.min(d.hours || 0.5, 0.5), title: "Travel lift", sub: "Hotel gym: goblet squats, DB press/row — or bands + bodyweight" };
      if (d.type === "strength" || d.anchor === "sim") return { ...d, type: "strength", sports: ["strength"], hours: Math.min(d.hours || 0.5, 0.5), title: "Room circuit", sub: "Bodyweight: lunges, push-ups, hollow holds, burpees" };
      if (d.sports.includes("swim") && d.type !== "brick") return { ...d, hours: 0.5, sub: "Hotel pool if you can — optional, zero guilt" };
      if (d.sports.includes("bike")) return { ...d, type: "rest", sports: [], hours: 0, title: "Rest", sub: "No bike on the road — that's fine" };
      if (d.sports.includes("run") && !d.anchor) { if (keptRun) return { ...d, hours: Math.min(d.hours || 0.5, 0.5) }; keptRun = true; return { ...d, hours: 0.5, sub: "30min from the hotel door" }; }
      return d;
    });
    return { days: out, note: "Travel week: runs need only shoes, strength fits a hotel room, the bike waits at home." };
  }
  return { days, note: null };
}

/* ------------------------------------------------------------------ */
/*  Load analytics — sport-weighted ACWR on hours (Gabbett window)     */
/* ------------------------------------------------------------------ */
function computeStats(activities) {
  if (!activities.length) return null;
  const byDay = {}, byDaySport = {};
  let first = null;
  activities.forEach((a) => {
    const load = a.hours * (LOAD_W[a.sport] || 1);
    byDay[a.key] = (byDay[a.key] || 0) + load;
    byDaySport[a.key] = byDaySport[a.key] || {};
    byDaySport[a.key][a.sport] = (byDaySport[a.key][a.sport] || 0) + a.hours;
    const d = strip(new Date(a.key + "T12:00:00"));
    if (!first || d < first) first = d;
  });
  const today = strip(new Date());
  const sumBack = (n) => { let s = 0; for (let i = 0; i < n; i++) s += byDay[key(addDays(today, -i))] || 0; return s; };
  const acute = sumBack(7) / 7, chronic = sumBack(28) / 28;
  const span = Math.round((today - first) / DAY) + 1;
  const mix = { swim: 0, bike: 0, run: 0, strength: 0 };
  for (let i = 0; i < 28; i++) {
    const m = byDaySport[key(addDays(today, -i))];
    if (m) Object.keys(mix).forEach((sp) => { mix[sp] += m[sp] || 0; });
  }
  const mixTotal = mix.swim + mix.bike + mix.run + mix.strength;
  const k7 = key(addDays(today, -6));
  const hours7 = activities.filter((a) => a.key >= k7).reduce((s, a) => s + a.hours, 0);
  let status, ratio = chronic > 0 ? acute / chronic : null;
  if (span < 14 || chronic < 0.15) status = "baseline";
  else if (ratio < 0.8) status = "fresh";
  else if (ratio <= 1.3) status = "optimal";
  else if (ratio <= 1.5) status = "elevated";
  else status = "high";
  return { byDay, byDaySport, acute, chronic, ratio, status, span, mix, mixTotal, hours7, hours28: mixTotal };
}

/* ------------------------------------------------------------------ */
/*  Coach's Read — benchmarks per race + evidence-based insights       */
/* ------------------------------------------------------------------ */
function coachRead(activities, stats, raceType, raceDateStr, P) {
  if (!stats) return null;
  const cfg = RACES[raceType];
  const gs = P ? P.gs : 1;
  const today = strip(new Date());

  // Per-sport: longest single day (60d) and weekly average (28d)
  const dayTotals = {};
  activities.forEach((a) => {
    if (a.key < key(addDays(today, -59))) return;
    dayTotals[a.key + "|" + a.sport] = (dayTotals[a.key + "|" + a.sport] || 0) + a.hours;
  });
  const longest = { swim: 0, bike: 0, run: 0, strength: 0 };
  Object.entries(dayTotals).forEach(([k, v]) => {
    const sp = k.split("|")[1];
    if (v > longest[sp]) longest[sp] = v;
  });
  const weekly = { swim: stats.mix.swim / 4, bike: stats.mix.bike / 4, run: stats.mix.run / 4, strength: stats.mix.strength / 4 };

  const benchmarks = cfg.bench.map((b) => {
    const val = b.kind === "longest" ? longest[b.sport] : weekly[b.sport];
    const pct = Math.min(100, Math.round((val / b.target) * 100));
    return { ...b, val, pct, status: pct >= 85 ? "Race-ready" : pct >= 50 ? "Building" : "The gap" };
  });
  const worst = benchmarks.reduce((a, b) => (b.pct < a.pct ? b : a));

  // Trends: last 4 weeks vs prior 8
  const recent = { swim: 0, bike: 0, run: 0, strength: 0 }, prior = { ...recent };
  const k28 = key(addDays(today, -27)), k84 = key(addDays(today, -83));
  activities.forEach((a) => {
    if (a.key >= k28) recent[a.sport] += a.hours;
    else if (a.key >= k84) prior[a.sport] += a.hours;
  });
  Object.keys(recent).forEach((sp) => { recent[sp] /= 4; prior[sp] /= 8; });

  const triDays = new Set(activities.filter((a) => a.key >= k28).map((a) => a.key)).size;
  const derived = {
    weeklyHours: Math.max(2.5, Math.round((stats.mixTotal / 4) * 2) / 2),
    daysPerWeek: Math.min(7, Math.max(4, Math.round(triDays / 4))),
    weakest: cfg.family === "tri"
      ? (benchmarks.filter((b) => ["swim", "bike", "run"].includes(b.sport)).reduce((a, b) => (b.pct < a.pct ? b : a)).sport)
      : "run",
  };

  // Timeline verdict from the slowest-closing gap
  let verdict = null;
  if (raceDateStr) {
    const race = strip(new Date(raceDateStr + "T12:00:00"));
    const weeksOut = Math.round((race - today) / (7 * DAY));
    if (weeksOut > 0) {
      let need = 0;
      benchmarks.forEach((b) => {
        const gap = Math.max(0, b.target - b.val);
        const rate = b.kind === "longest" ? GROWTH[b.sport] * gs : WEEKLY_GROWTH;
        need = Math.max(need, Math.ceil(gap / rate));
      });
      need += cfg.taper + 1;
      verdict = weeksOut >= need + 2
        ? { label: "On schedule", tone: "green", text: "About " + need + " weeks of patient building closes your biggest gap — you have " + weeksOut + "." }
        : weeksOut >= need - 1
          ? { label: "Tight", tone: "amber", text: "Closing the " + worst.sport + " gap needs ~" + need + " weeks; you have " + weeksOut + ". Every key session counts from here." }
          : { label: "Rushed", tone: "red", text: "The " + worst.sport + " gap wants ~" + need + " weeks; you have " + weeksOut + ". A shorter event first, or a later date, is the honest play." };
    }
  }

  // Insights, priority-ordered
  const insights = [];
  const collapsed = Object.keys(recent).map((sp) => ({ sp, r: recent[sp], p: prior[sp] }))
    .filter((x) => x.p >= 0.75 && x.r < 0.4 * x.p).sort((a, b) => b.p - a.p)[0];
  if (collapsed)
    insights.push({ icon: TrendingDown, tone: "amber", text: "You averaged " + fmtHM(collapsed.p) + "/wk of " + collapsed.sp + " over the prior two months — the last four weeks it's " + fmtHM(collapsed.r) + ". Whatever broke that streak is fix #1." });

  // Polarized-intensity check (Seiler 80/20) — needs HR-tagged runs/rides
  if (P && P.z2) {
    const hrSess = activities.filter((a) => a.key >= k28 && a.avgHR && (a.sport === "run" || a.sport === "bike"));
    if (hrSess.length >= 6) {
      const hardT = hrSess.filter((a) => a.avgHR > P.z2[1]).reduce((s, a) => s + a.hours, 0);
      const totT = hrSess.reduce((s, a) => s + a.hours, 0);
      const hardPct = Math.round((hardT / totT) * 100);
      if (hardPct > 35)
        insights.push({ icon: HeartPulse, tone: "amber", text: hardPct + "% of your HR-logged cardio sits above your Z2 ceiling (" + P.z2[1] + "bpm). Polarized 80/20 evidence (Seiler) says most aerobic gain comes from keeping easy truly easy — slow the easy days down." });
      else if (hardPct >= 12)
        insights.push({ icon: HeartPulse, tone: "green", text: "Intensity split: ~" + hardPct + "% hard / " + (100 - hardPct) + "% easy over the last month — textbook polarized distribution (Seiler 80/20). Keep it." });
      else
        insights.push({ icon: HeartPulse, tone: "steel", text: "Nearly all your HR-logged cardio is easy. Great base — now earn it interest: one quality session a week (4×4min @ " + (P.z45 ? P.z45[0] + "–" + P.z45[1] + "bpm" : "90–95% HRmax") + ", Helgerud) is where VO2max moves." });
    }
  }

  const dom = Object.keys(stats.mix).find((sp) => stats.mixTotal > 2 && stats.mix[sp] / stats.mixTotal > 0.55);
  if (dom) {
    const others = cfg.bench.map((b) => b.sport).filter((x, i, arr) => x !== dom && arr.indexOf(x) === i);
    insights.push({ icon: Gauge, tone: "steel", text: dom.charAt(0).toUpperCase() + dom.slice(1) + " is " + Math.round((stats.mix[dom] / stats.mixTotal) * 100) + "% of your recent training. " + (others.length ? "This race will be decided on " + others.join(" and ") + " — the plan redistributes, it doesn't add." : "") });
  }
  if (worst.pct < 50 && worst.sport === "run")
    insights.push({ icon: Footprints, tone: "ink", text: "Your engine likely exists — your legs haven't been asked yet. Run volume grows by tissue tolerance, not fitness (tendon and bone adapt on a slower clock than VO2max). Patience beats heroics." });
  if (cfg.family === "hybrid" && weekly.strength < 1 && stats.mixTotal > 2)
    insights.push({ icon: Dumbbell, tone: "amber", text: "Station strength is " + fmtHM(weekly.strength) + "/wk — " + cfg.short + " is decided by compromised running: legs that still run after sleds and carries. The sim sessions are the race." });
  if (triDays / 4 >= 5)
    insights.push({ icon: CheckCircle2, tone: "green", text: "You trained " + triDays + " of the last 28 days. Consistency is your superpower — the plan redirects it rather than asking for more." });
  if (P && P.masters)
    insights.push({ icon: Moon, tone: "steel", text: "Masters protocol active: recovery weeks every 3rd week and gentler long-session growth — recovery capacity, not fitness, is the age-related constraint." });

  return { benchmarks, insights: insights.slice(0, 4), verdict, derived, longest, weekly };
}

function buildRecs(stats, plan, currentWeek, s) {
  const recs = [];
  if (!stats) {
    recs.push({ icon: Upload, tone: "steel", text: "Import your watch data (or load the demo) and the plan starts adapting to your real training load." });
    return recs;
  }
  if (stats.status === "baseline")
    recs.push({ icon: Activity, tone: "steel", text: "Building your baseline — " + stats.span + " days of history so far. After ~2 weeks of data, readiness gets accurate." });
  if (stats.status === "high")
    recs.push({ icon: AlertTriangle, tone: "red", text: "Your last 7 days are " + Math.round((stats.ratio - 1) * 100) + "% above your 4-week norm — outside the 0.8–1.3 sweet spot (Gabbett). Cut weekday intensity ~25% and cap the long session this week." });
  else if (stats.status === "elevated")
    recs.push({ icon: AlertTriangle, tone: "amber", text: "Load is climbing faster than you're adapting (ACWR " + stats.ratio.toFixed(2) + "). Keep the long session; make every other one genuinely easy." });
  else if (stats.status === "fresh")
    recs.push({ icon: Footprints, tone: "steel", text: "You're fresher than your recent norm — ease back in at this week's plan. Don't stack sessions to catch up; consistency beats heroics." });
  else if (stats.status === "optimal")
    recs.push({ icon: CheckCircle2, tone: "green", text: "Load is in the 0.8–1.3 sweet spot (Gabbett). Green light for this week as written." });
  if (plan && currentWeek && currentWeek.phase !== "Race week")
    recs.push({ icon: Moon, tone: "ink", text: currentWeek.phase + " phase: " + fmtHM(currentWeek.target) + " this week. " + (currentWeek.phase === "Build" || currentWeek.phase === "Peak" ? "Fuel every session over 90min — gut training is training (Jeukendrup)." : currentWeek.phase === "Taper" ? "Volume drops, intensity stays — that's the protocol with the best evidence (Mujika)." : "Rest days are part of the plan.") });
  if (s && s.lifts && currentWeek && currentWeek.phase !== "Race week")
    recs.push({ icon: Dumbbell, tone: "ink", text: (currentWeek.phase === "Taper" ? "Lifting is on a deload this week — light and crisp, legs fresh for race day. " : currentWeek.phase === "Peak" ? "Lifting drops to maintenance now — keep the strength, spare the legs. " : "Lifting is stacked onto your hard days so easy days stay easy. ") + "Heavy lower-body work is kept off the day before key runs." });
  return recs.slice(0, 4);
}

/* ------------------------------------------------------------------ */
/*  Game engine — season XP, levels, streaks, quest, badges            */
/* ------------------------------------------------------------------ */
const LEVELS = [
  { xp: 0, t: "Start-Line Rookie" }, { xp: 500, t: "Lap Counter" }, { xp: 1200, t: "Brick Layer" },
  { xp: 2200, t: "Tempo Technician" }, { xp: 3600, t: "Engine Builder" }, { xp: 5400, t: "Negative Splitter" },
  { xp: 7800, t: "Compromised Runner" }, { xp: 10800, t: "Podium Dreamer" }, { xp: 14400, t: "Finish-Line Hunter" },
  { xp: 18600, t: "Endurance Legend" },
];
const levelOf = (xp) => { let i = 0; LEVELS.forEach((l, j) => { if (xp >= l.xp) i = j; }); return i; };

function seasonXP(acts) {
  const cut = key(addDays(strip(new Date()), -89));
  let xp = 0;
  const dayTot = {};
  acts.forEach((a) => {
    if (a.key < cut) return;
    xp += a.hours * (a.sport === "strength" ? 85 : 100);
    dayTot[a.key + "|" + a.sport] = (dayTot[a.key + "|" + a.sport] || 0) + a.hours;
  });
  Object.values(dayTot).forEach((h) => { if (h >= 2) xp += 100; });
  return Math.round(xp);
}

function computeGame(activities, plan, read, raceType) {
  const today = strip(new Date());
  const cut = key(addDays(today, -89));
  let xp = seasonXP(activities);

  const sportsByDay = {};
  activities.forEach((a) => { if (a.key >= cut) { sportsByDay[a.key] = sportsByDay[a.key] || new Set(); sportsByDay[a.key].add(a.sport); } });
  Object.values(sportsByDay).forEach((s) => { if ((s.has("bike") || s.has("strength")) && s.has("run")) xp += 75; });

  if (plan) {
    const logged = {};
    activities.forEach((a) => { logged[a.key] = logged[a.key] || {}; logged[a.key][a.sport] = (logged[a.key][a.sport] || 0) + a.hours; });
    plan.weeks.forEach((w) => w.days.forEach((d) => {
      const dk = key(d.date);
      if (dk > key(today) || !d.hours || d.type === "rest" || d.type === "race") return;
      const got = d.sports.reduce((s, sp) => s + ((logged[dk] || {})[sp] || 0), 0);
      if (got >= d.hours * 0.6) xp += 60;
    }));
  }

  let quest = null;
  if (read) {
    const worst = read.benchmarks.reduce((a, b) => (b.pct < a.pct ? b : a));
    if (worst.pct < 100) {
      const wkStart = key(monday(today));
      if (worst.kind === "longest") {
        const target = Math.max(0.5, q25(Math.min(worst.target, (read.longest[worst.sport] || 0) + 2 * GROWTH[worst.sport])));
        const dayTot = {};
        activities.forEach((a) => { if (a.key >= wkStart && a.sport === worst.sport) dayTot[a.key] = (dayTot[a.key] || 0) + a.hours; });
        const done = Object.values(dayTot).some((h) => h >= target);
        if (done) xp += 150;
        quest = { sport: worst.sport, done, xp: 150, label: "one " + worst.sport + " session of " + fmtHM(target) + "+" };
      } else {
        const target = Math.max(0.5, q25(Math.min(worst.target, (read.weekly[worst.sport] || 0) + WEEKLY_GROWTH)));
        const got = activities.filter((a) => a.key >= wkStart && a.sport === worst.sport).reduce((s, a) => s + a.hours, 0);
        const done = got >= target;
        if (done) xp += 150;
        quest = { sport: worst.sport, done, xp: 150, label: fmtHM(target) + " of " + worst.sport + " this week (" + fmtHM(got) + " so far)" };
      }
    } else {
      quest = { sport: null, done: false, xp: 200, label: "Hit every planned session this week" };
    }
  }

  const sessionsByWeek = {};
  activities.forEach((a) => { const wk = key(monday(new Date(a.key + "T12:00:00"))); sessionsByWeek[wk] = (sessionsByWeek[wk] || 0) + 1; });
  let streak = 0;
  let w = monday(today);
  if ((sessionsByWeek[key(w)] || 0) < 3) w = addDays(w, -7);
  while ((sessionsByWeek[key(w)] || 0) >= 3) { streak++; w = addDays(w, -7); }

  const cfg = RACES[raceType];
  const allDayTot = {};
  activities.forEach((a) => { allDayTot[a.key + "|" + a.sport] = (allDayTot[a.key + "|" + a.sport] || 0) + a.hours; });
  const maxOf = (sp) => Math.max(0, ...Object.entries(allDayTot).filter(([k]) => k.endsWith("|" + sp)).map(([, v]) => v));
  const weeksAll = {};
  activities.forEach((a) => { const wk = key(monday(new Date(a.key + "T12:00:00"))); weeksAll[wk] = weeksAll[wk] || new Set(); weeksAll[wk].add(a.sport); });
  const k28 = key(addDays(today, -27));
  const days28 = new Set(activities.filter((a) => a.key >= k28).map((a) => a.key)).size;
  const str28 = activities.filter((a) => a.sport === "strength" && a.key >= k28).length;
  const hrs28 = activities.filter((a) => a.key >= k28).reduce((s, a) => s + a.hours, 0);
  const runBench = cfg.bench.find((b) => b.sport === "run" && b.kind === "longest");
  const badges = [
    { id: "long", name: "The Long One", icon: Footprints, earned: !!runBench && maxOf("run") >= runBench.target, desc: "A run at race-build duration (" + fmtHM(runBench ? runBench.target : 2) + ")" },
    { id: "haul", name: "Long Hauler", icon: Bike, earned: maxOf("bike") >= 2.5, desc: "A 2h 30m+ ride" },
    { id: "triple", name: "Triple Threat", icon: Star, earned: Object.values(weeksAll).some((s) => s.size >= 3), desc: "Three modalities in one week" },
    { id: "brick", name: "Compromised Runner", icon: Zap, earned: Object.values(sportsByDay).some((s) => s.has("run") && (s.has("bike") || s.has("strength"))), desc: "Run + bike or stations, same day" },
    { id: "metro", name: "Metronome", icon: Activity, earned: days28 >= 20, desc: "Train 20 of 28 days" },
    { id: "armor", name: "Iron Armor", icon: Shield, earned: str28 >= 4, desc: "4+ strength sessions in a month" },
    { id: "monster", name: "Monster Month", icon: Trophy, earned: hrs28 >= Math.max(14, cfg.peakMax * 1.6), desc: fmtHM(Math.max(14, cfg.peakMax * 1.6)) + "+ in 28 days" },
    { id: "taper", name: "The Taper Gate", icon: Flag, earned: !!(plan && plan.weeks.some((wk) => (wk.phase === "Taper" || wk.phase === "Race week") && key(wk.start) <= key(today))), desc: "Reach the taper" },
  ];
  xp = Math.round(xp);
  const lvl = levelOf(xp);
  return { xp, lvl, title: LEVELS[lvl].t, next: LEVELS[lvl + 1] || null, streak, quest, badges, earnedCount: badges.filter((b) => b.earned).length };
}

/* ------------------------------------------------------------------ */
/*  Import / demo — now captures distance + avg HR for VO2max          */
/* ------------------------------------------------------------------ */
function rowsToActivities(rows, fields, fileUnit) {
  const find = (re) => fields.find((f) => re.test(f));
  const cDate = find(/date/i), cTime = find(/^(time|duration|elapsed|moving)/i),
    cType = find(/activity\s*type|^type$/i), cDist = find(/^distance/i), cHR = find(/avg.*(hr|heart)|average.*heart/i);
  if (!cDate || !cTime) return { error: "Couldn't find Date and Time columns. Export the activity list as CSV from Garmin Connect (or Strava's activities.csv), or log sessions manually." };
  const out = [];
  rows.forEach((r) => {
    const sport = cType ? classify(r[cType]) : "run";
    if (!sport) return;
    const d = new Date(String(r[cDate]).replace(" ", "T"));
    const hours = parseDur(r[cTime]);
    if (isNaN(d.getTime()) || hours <= 0 || hours > 18) return;
    let distMi = null;
    if (cDist && (sport === "run" || sport === "bike")) {
      const raw = parseFloat(String(r[cDist]).replace(/,/g, ""));
      if (!isNaN(raw) && raw > 0) distMi = fileUnit === "km" ? raw / 1.60934 : raw;
      if (distMi && distMi > 300) distMi = null; // probably meters in a weird export — drop rather than guess
    }
    let avgHR = null;
    if (cHR) { const h = parseFloat(r[cHR]); if (!isNaN(h) && h > 60 && h < 230) avgHR = h; }
    out.push({ key: key(strip(d)), sport, hours, distMi, avgHR });
  });
  return out.length ? { activities: out } : { error: "No endurance activities found in that file." };
}
function demoActivities() {
  const out = [];
  const today = strip(new Date());
  for (let w = 11; w >= 0; w--) {
    const wStart = addDays(monday(today), -7 * w);
    const late = w <= 3;
    const fit = (11 - w) * 0.15; // slow fitness drift for the VO2 trend
    const sessions = late
      ? [[1, "run", 0.75, 4.6 + fit * 0.1, 148], [3, "strength", 0.9, null, null], [4, "run", 0.55, 3.9, 166], [5, "strength", 0.8, null, null], [6, "run", 1.25, 7.6 + fit * 0.2, 150]]
      : [[1, "run", 0.7, 4.3 + fit * 0.1, 150], [2, "bike", 1.2, null, 138], [3, "strength", 0.6, null, null], [5, "bike", 2 + (11 - w) * 0.08, null, 136], [6, "run", 0.9, 5.4 + fit * 0.15, 152]];
    sessions.forEach(([dow, sport, hrs, distMi, avgHR]) => {
      const date = addDays(wStart, dow);
      if (date > today) return;
      out.push({ key: key(date), sport, hours: +hrs.toFixed(2), distMi: distMi ? +distMi.toFixed(2) : null, avgHR });
    });
  }
  // one honest hard effort so VDOT has a race-like data point
  out.push({ key: key(addDays(today, -9)), sport: "run", hours: 0.42, distMi: 3.11, avgHR: 178 });
  return out;
}

/* ------------------------------------------------------------------ */
/*  UI bits                                                            */
/* ------------------------------------------------------------------ */
function CourseLine({ plan }) {
  const segs = [];
  let cur = null;
  plan.weeks.forEach((w) => {
    if (cur && cur.phase === w.phase) cur.n++;
    else { cur = { phase: w.phase, n: 1 }; segs.push(cur); }
  });
  const total = plan.totalWeeks;
  const elapsed = Math.min(1, Math.max(0, (strip(new Date()) - plan.weeks[0].start) / (plan.race - plan.weeks[0].start)));
  return (
    <div>
      <div className="relative" style={{ height: 26 }}>
        <div className="absolute flex" style={{ left: 0, right: 28, top: 10, height: 6, borderRadius: 3, overflow: "hidden" }}>
          {segs.map((g, i) => (
            <div key={i} style={{ width: (g.n / total) * 100 + "%", background: PHASE_COLOR[g.phase], opacity: 0.85 }} />
          ))}
        </div>
        <div className="absolute" style={{ left: "calc(" + elapsed + " * (100% - 28px) - 7px)", top: 6 }} title="You are here">
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--ink)", border: "3px solid var(--paper)", boxShadow: "0 0 0 1px var(--ink)" }} />
        </div>
        <Flag size={17} className="absolute" style={{ right: 0, top: 2, color: "var(--ink)" }} />
      </div>
      <div className="flex" style={{ paddingRight: 28 }}>
        {segs.map((g, i) => (
          <div key={i} className="tc-eyebrow" style={{ width: (g.n / total) * 100 + "%", fontSize: 10, color: PHASE_COLOR[g.phase], overflow: "hidden", whiteSpace: "nowrap" }}>
            {g.n / total > 0.07 ? g.phase : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="tc-eyebrow block mb-1">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>{hint}</span>}
    </label>
  );
}

function BenchBar({ b }) {
  const meta = SPORT_META[b.sport];
  const Icon = meta.icon;
  const color = b.pct >= 85 ? "var(--green)" : b.pct >= 50 ? "var(--amber)" : "var(--red)";
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} style={{ color: meta.fg, flexShrink: 0 }} />
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="font-medium" style={{ textTransform: "capitalize" }}>
            {b.sport}{b.kind === "weekly" ? " /wk" : " · longest"}
          </span>
          <span className="tc-mono" style={{ color: "var(--ink-soft)" }}>{fmtHM(b.val)} of {fmtHM(b.target)}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}>
          <div className="tc-fill" style={{ width: b.pct + "%", height: "100%", background: color, borderRadius: 4 }} />
        </div>
      </div>
      <span className="tc-chip" style={{ background: "transparent", color, padding: 0, minWidth: 76, textAlign: "right" }}>{b.status}</span>
    </div>
  );
}

function LadderBar({ L, value }) {
  const p = ladderPlace(value, L);
  const segColors = ["#C9BCa8", "var(--steel)", "var(--green)", "var(--amber)", "var(--orange)"];
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-medium text-sm">{L.metric} <span style={{ color: "var(--ink-soft)" }}>· {L.sub}</span></span>
        <span className="tc-mono text-xs" style={{ color: "var(--ink-soft)" }}>
          {value != null ? "you: " + L.fmt(value) : "log a run to place yourself"}
        </span>
      </div>
      <div className="relative" style={{ height: 22 }}>
        <div className="absolute left-0 right-0 flex" style={{ top: 8, height: 7, borderRadius: 4, overflow: "hidden" }}>
          {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ flex: 1, background: segColors[i], opacity: 0.5 }} />)}
        </div>
        {p && <div className="tc-you" style={{ left: p.pos + "%" }} title={"You: " + L.fmt(value)} />}
        <Medal size={13} className="absolute" style={{ right: -2, top: 4, color: "var(--orange)" }} />
      </div>
      <div className="flex justify-between mt-0.5" style={{ fontSize: 9 }}>
        {TIER_LABELS.map((t, i) => (
          <span key={i} className="tc-eyebrow" style={{ fontSize: 9, letterSpacing: ".04em", width: "20%", textAlign: i === 0 ? "left" : i === 4 ? "right" : "center", color: p && p.tier === i ? "var(--ink)" : "var(--ink-soft)", fontWeight: p && p.tier === i ? 700 : 600 }}>{t}</span>
        ))}
      </div>
      <div className="text-xs mt-1.5" style={{ color: "var(--ink-soft)" }}>
        {p
          ? (p.atTop
            ? "Elite tier. " + L.elite
            : "You're at " + TIER_LABELS[p.tier].toLowerCase() + ". Next rung — " + p.nextLabel.toLowerCase() + " — is " + L.fmt(p.nextVal) + ". " + L.habit)
          : L.elite}
      </div>
    </div>
  );
}

/* Apple-style activity rings — tap a ring (or its legend row) to read it. */
function FormRings({ rings }) {
  const [sel, setSel] = useState(0);
  const R = [64, 47, 30], SW = 10, CX = 82;
  return (
    <div className="tc-card p-4 sm:p-5 mb-4">
      <div className="tc-eyebrow mb-2 flex items-center gap-1.5"><Activity size={14} /> Form at a glance · this week</div>
      <div className="flex items-center gap-5 flex-wrap">
        <svg width="164" height="164" viewBox="0 0 164 164" style={{ flexShrink: 0 }}>
          {rings.map((rg, i) => {
            const r = R[i], c = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, rg.pct || 0));
            return (
              <g key={i} onMouseEnter={() => setSel(i)} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
                <circle cx={CX} cy={CX} r={r} fill="none" stroke="var(--track)" strokeWidth={SW} />
                <circle cx={CX} cy={CX} r={r} fill="none" stroke={rg.color} strokeWidth={SW} strokeLinecap="round"
                  transform={`rotate(-90 ${CX} ${CX})`} strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="tc-ring"
                  style={{ filter: sel === i ? "drop-shadow(0 0 5px " + rg.color + ")" : "none", opacity: sel === i ? 1 : 0.85 }} />
              </g>
            );
          })}
          <text x={CX} y={CX - 1} textAnchor="middle" className="tc-display" style={{ fontSize: 22, fontWeight: 700, fill: "var(--ink)" }}>{Math.round((rings[sel].pct || 0) * 100)}%</text>
          <text x={CX} y={CX + 15} textAnchor="middle" className="tc-eyebrow" style={{ fontSize: 9.5, fill: "var(--ink-soft)" }}>{rings[sel].label}</text>
        </svg>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {rings.map((rg, i) => (
            <button key={i} onClick={() => setSel(i)} className="flex items-center gap-2.5 text-left p-1.5 rounded-xl"
              style={{ opacity: sel === i ? 1 : 0.62, background: sel === i ? "var(--track)" : "transparent" }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: rg.color, flexShrink: 0, boxShadow: "0 0 0 3px " + rg.color + "22" }} />
              <span className="flex-1 min-w-0">
                <span className="font-medium text-sm">{rg.label}</span>
                <span className="text-xs block truncate" style={{ color: "var(--ink-soft)" }}>{rg.detail}</span>
              </span>
              <span className="tc-mono text-sm" style={{ color: rg.color }}>{rg.value}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* 12-week consistency heatmap — hover a day to read it. */
function ConsistencyGrid({ activities }) {
  const [hover, setHover] = useState(null);
  const today = strip(new Date());
  const start = monday(addDays(today, -7 * 11));
  const load = {}, top = {};
  activities.forEach((a) => {
    load[a.key] = (load[a.key] || 0) + a.hours;
    top[a.key] = top[a.key] || {}; top[a.key][a.sport] = (top[a.key][a.sport] || 0) + a.hours;
  });
  const max = Math.max(1, ...Object.values(load));
  const cols = [];
  let moved = 0, total = 0;
  for (let w = 0; w < 12; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d), k = key(date), fut = date > today, h = load[k] || 0;
      if (!fut) { total++; if (h > 0) moved++; }
      col.push({ date, k, h, fut, isToday: k === key(today) });
    }
    cols.push(col);
  }
  const MIX = { swim: "var(--steel)", bike: "var(--orange)", run: "var(--green)", strength: "var(--amber)" };
  const domSport = (k) => { const m = top[k]; if (!m) return "var(--orange)"; return MIX[Object.keys(m).sort((a, b) => m[b] - m[a])[0]]; };
  return (
    <div className="tc-card p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <span className="tc-eyebrow flex items-center gap-1.5"><Flame size={14} /> Consistency · last 12 weeks</span>
        <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
          {hover ? fmtDate(hover.date) + " · " + (hover.h > 0 ? fmtHM(hover.h) : "rest") : "You've trained " + moved + " of " + total + " days"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: "repeat(7, 1fr)", gap: 5, width: "100%", height: 196 }} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 7 }).map((_, di) =>
          cols.map((col, ci) => {
            const cell = col[di];
            const op = cell.h <= 0 ? 0 : 0.3 + 0.6 * Math.min(1, cell.h / (max * 0.8));
            return (
              <div key={ci + "-" + di} onMouseEnter={() => !cell.fut && setHover(cell)}
                title={fmtDate(cell.date) + (cell.h > 0 ? " · " + fmtHM(cell.h) : "")}
                style={{
                  borderRadius: 6, width: "100%", height: "100%",
                  background: cell.fut ? "transparent" : cell.h > 0 ? domSport(cell.k) : "var(--track)",
                  opacity: cell.fut ? 0.22 : cell.h > 0 ? op : 1,
                  border: cell.isToday ? "1.5px solid var(--ink)" : hover && hover.k === cell.k ? "1.5px solid var(--ink-soft)" : "1.5px solid transparent",
                  cursor: cell.fut ? "default" : "pointer",
                }} />
            );
          })
        )}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: "var(--ink-soft)" }}>
        <span className="flex items-center gap-1.5"><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--steel)" }} />swim</span>
        <span className="flex items-center gap-1.5"><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--orange)" }} />bike</span>
        <span className="flex items-center gap-1.5"><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green)" }} />run</span>
        <span className="flex items-center gap-1.5"><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--amber)" }} />strength</span>
      </div>
    </div>
  );
}

const QUIPS = [
  "Easy days easy, hard days hard — the magic is in the gap between them.",
  "You can't bank fitness, but you can bank consistency. Show up small, show up often.",
  "The long run builds the engine. The easy runs keep it from blowing up.",
  "Rest isn't the absence of training — it's the part where you actually get faster.",
  "Fuel the work over 90 minutes. The gut is a trainable organ too.",
  "Heavy legs the day before a key run is a tax, not a flex. Time your lifts.",
  "VO2max moves with 4×4 minutes hard. Comfort never raised anyone's ceiling.",
  "Tendons and bones adapt slower than your lungs. Patience is a training variable.",
  "A taper feels like cheating. Trust it — the work is already in the bank.",
  "Negative splits win races and build confidence. Start brave, finish braver.",
];
function CoachCorner() {
  const [i, setI] = useState(() => Math.floor(Math.random() * QUIPS.length));
  return (
    <div className="flex items-start gap-2.5 mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
      <Sparkles size={16} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 text-sm" style={{ minWidth: 0 }}>
        <span className="tc-eyebrow" style={{ fontSize: 10 }}>Coach's corner</span>
        <div style={{ marginTop: 1 }}>{QUIPS[i]}</div>
      </div>
      <button className="tc-btn tc-btn-ghost px-2.5 py-1 text-xs flex items-center gap-1 self-start" style={{ flexShrink: 0 }}
        onClick={() => setI((p) => (p + 1 + Math.floor(Math.random() * (QUIPS.length - 1))) % QUIPS.length)}>
        <Sparkles size={11} /> New
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
// Persist the setup + profile across sessions so reopening the app restores
// everything (the Strava connection itself persists via the Supabase session
// kept in useLiveActivities). Versioned keys so the shape can evolve safely.
const LS = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};
const DEFAULT_DRAFT = {
  raceType: "full", goalTime: "",            // default race: Ironman-distance (140.6)
  weeklyHours: 5, daysPerWeek: 5, weakest: "run", capMin: 60,
  age: 29, weight: 160, wUnit: "lb", height: "", hUnit: "in", rhr: "", sex: "",
  lifts: false, liftDays: 2, liftFocus: "full",
};

/* ----------------------- Auth / paywall screens ------------------------ */
function Splash({ theme, label }) {
  return (
    <div className={"tc-root flex items-center justify-center p-8" + (theme === "dark" ? " tc-dark" : "")}>
      <style>{CSS}</style>
      <div className="tc-mono text-sm" style={{ color: "var(--ink-soft)" }}>{label}</div>
    </div>
  );
}

const MONTHLY_PRICE = "$12"; // ← set to your real Stripe monthly price (must match STRIPE_PRICE_ID)

function SignInButtons({ stack }) {
  return (
    <div className={"flex gap-2 " + (stack ? "flex-col" : "flex-col sm:flex-row")}>
      <a className="tc-btn py-3 px-5 flex items-center justify-center gap-2 text-base"
        style={{ background: "#FC4C02", color: "#fff" }} href={stravaLoginUrl()}>
        <Radio size={18} /> Sign in with Strava
      </a>
      <button className="tc-btn tc-btn-ghost py-3 px-5 flex items-center justify-center gap-2 text-base"
        onClick={() => signInWithGoogle()}>
        Continue with Google
      </button>
    </div>
  );
}

function Landing({ theme }) {
  const features = [
    [Radio, "Live Strava sync", "Connect once. Every watch upload appears in seconds — no files, no fuss — and your plan adjusts to what you actually did."],
    [Activity, "Adaptive race plans", "One engine for Ironman, 70.3, marathon, HYROX and Spartan — periodized, tapered, and re-planned around your real week."],
    [Wind, "VO2max & readiness", "VDOT from your real efforts, ACWR load monitoring, and an 80/20 intensity check — push when fresh, back off before injury."],
    [Dumbbell, "Strength, built in", "Concurrent-training aware: lifts stack onto hard days and taper toward race day, so the gym helps your race instead of fighting it."],
  ];
  const steps = [
    ["1", "Sign in with Strava", "One tap connects your account and pulls 180 days of history, so your plan starts from who you actually are."],
    ["2", "Get your plan", "Pick a race and date — the engine builds a periodized, science-based plan tuned to your fitness and schedule."],
    ["3", "Train — it adapts", "Every session syncs automatically; readiness, load and your plan update in real time."],
  ];
  const included = [
    "Unlimited adaptive training plans, any race",
    "Live Strava auto-sync + 180-day history",
    "VO2max / VDOT, readiness (ACWR) & 80/20 tracking",
    "Strength integration and weekly adaptation",
    "Mobile-ready, light/dark — your data private to you",
  ];
  const faqs = [
    ["Do I need a credit card to start?", "No. Sign in and use everything free for 30 days. You only add a card if you choose to subscribe afterward."],
    ["How do I cancel?", "Anytime, in one click from your account — you keep access until the period ends. No emails, no hassle."],
    ["Which races are supported?", "Ironman (140.6), 70.3, 5K through marathon, HYROX, DEKA and Spartan — one engine, tuned per race."],
    ["Is my data private?", "Yes. Your Strava data is shown only to you, never sold, and never fed into AI/ML — the coaching engine is heuristic and evidence-based."],
  ];
  return (
    <div className={"tc-root" + (theme === "dark" ? " tc-dark" : "")}>
      <style>{CSS}</style>

      <nav className="sticky top-0 z-10" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "var(--paper)", borderBottom: "1px solid var(--line)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="tc-display flex items-center gap-2" style={{ fontWeight: 700, fontSize: 18 }}>
            <Activity size={18} style={{ color: "var(--orange)" }} /> Endurance Coach
          </span>
          <div className="flex items-center gap-4">
            <a href="#how" className="text-sm hidden sm:inline" style={{ color: "var(--ink-soft)" }}>How it works</a>
            <a href="#pricing" className="text-sm hidden sm:inline" style={{ color: "var(--ink-soft)" }}>Pricing</a>
            <a className="tc-btn tc-btn-ghost px-3 py-1.5 text-sm" href={stravaLoginUrl()}>Sign in</a>
          </div>
        </div>
      </nav>

      <header className="max-w-5xl mx-auto px-4 pt-12 sm:pt-20 pb-10 text-center">
        <div className="tc-eyebrow" style={{ color: "var(--orange)" }}>Adaptive endurance coach · evidence-based</div>
        <h1 className="tc-display mx-auto" style={{ fontSize: "clamp(40px,8vw,76px)", fontWeight: 700, lineHeight: 1.02, margin: "12px 0 0", maxWidth: 760 }}>
          Pick a start line.<br />Train around your life.
        </h1>
        <p className="mt-5 mx-auto" style={{ color: "var(--ink-soft)", maxWidth: 560, fontSize: 18 }}>
          Ironman to HYROX to Spartan — one engine, tuned per race, built on published training science. Connect Strava and your plan starts from who you actually are.
        </p>
        <div className="mt-7 flex justify-center"><SignInButtons /></div>
        <div className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>30-day free trial · no card to start · cancel anytime</div>
        <div className="mt-7 flex flex-wrap gap-2 justify-center">
          {["Ironman 140.6", "70.3", "Marathon", "HYROX", "Spartan"].map((r) => (
            <span key={r} className="tc-chip" style={{ background: "var(--steel-soft)", color: "var(--steel)" }}>{r}</span>
          ))}
        </div>
      </header>

      <section id="features" className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(([Icon, title, body]) => (
            <div key={title} className="tc-card p-5">
              <Icon size={22} style={{ color: "var(--orange)" }} />
              <div className="tc-display mt-2" style={{ fontSize: 19, fontWeight: 600 }}>{title}</div>
              <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="max-w-5xl mx-auto px-4 py-10">
        <div className="tc-eyebrow text-center mb-6" style={{ color: "var(--orange)" }}>How it works</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map(([n, title, body]) => (
            <div key={n} className="tc-card p-5">
              <div className="tc-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--orange)" }}>{n}</div>
              <div className="tc-display mt-1" style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
              <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="max-w-5xl mx-auto px-4 py-10">
        <div className="tc-eyebrow text-center" style={{ color: "var(--orange)" }}>How the subscription works</div>
        <h2 className="tc-display text-center mt-2" style={{ fontSize: "clamp(28px,5vw,40px)", fontWeight: 700 }}>Free for 30 days. Then keep going.</h2>
        <p className="text-center mt-3 mx-auto" style={{ color: "var(--ink-soft)", maxWidth: 560 }}>
          Start today with full access — no card needed. After 30 days, subscribe to keep your plan and live sync. Your data is saved the whole time, and you can cancel anytime.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-7">
          {[
            ["Day 0", "Sign in & start", "Full access, instantly. No payment details."],
            ["Days 1–30", "Train free", "Everything unlocked — build your fitness and your plan."],
            ["Day 30+", "Subscribe to continue", MONTHLY_PRICE + "/month. Cancel anytime, keep your data."],
          ].map(([k, t, b]) => (
            <div key={k} className="tc-card p-4">
              <div className="tc-eyebrow" style={{ color: "var(--steel)" }}>{k}</div>
              <div className="tc-display mt-1" style={{ fontSize: 17, fontWeight: 600 }}>{t}</div>
              <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>{b}</p>
            </div>
          ))}
        </div>

        <div className="tc-card p-6 mt-6 mx-auto" style={{ maxWidth: 460, textAlign: "center" }}>
          <div className="tc-eyebrow" style={{ color: "var(--orange)" }}>Endurance Coach Pro</div>
          <div className="flex items-baseline justify-center gap-1 mt-2">
            <span className="tc-display" style={{ fontSize: 48, fontWeight: 700 }}>{MONTHLY_PRICE}</span>
            <span style={{ color: "var(--ink-soft)" }}>/ month</span>
          </div>
          <div className="text-sm" style={{ color: "var(--green)" }}>after your 30-day free trial</div>
          <div className="flex flex-col gap-2 mt-5 text-left">
            {included.map((it) => (
              <div key={it} className="flex items-start gap-2 text-sm">
                <CheckCircle2 size={16} style={{ color: "var(--green)", flexShrink: 0, marginTop: 2 }} /> <span>{it}</span>
              </div>
            ))}
          </div>
          <div className="mt-6"><SignInButtons stack /></div>
          <p className="text-xs mt-3" style={{ color: "var(--ink-soft)" }}>No card to start · cancel anytime · secure checkout by Stripe</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-10">
        <div className="tc-eyebrow text-center mb-5" style={{ color: "var(--orange)" }}>FAQ</div>
        <div className="flex flex-col gap-3">
          {faqs.map(([q, a]) => (
            <div key={q} className="tc-card p-4">
              <div className="tc-display" style={{ fontSize: 16, fontWeight: 600 }}>{q}</div>
              <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>{a}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8"><SignInButtons /></div>
      </section>

      <footer style={{ borderTop: "1px solid var(--line)" }}>
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs" style={{ color: "var(--ink-soft)" }}>
          <span>© {new Date().getFullYear()} Endurance Coach · Powered by Strava</span>
          <span>Methods: Seiler · Daniels–Gilbert · Mujika · Gabbett · Jeukendrup. Estimates, not medical advice.</span>
        </div>
      </footer>
    </div>
  );
}

function Paywall({ theme, sub, onSubscribe, onSignOut }) {
  return (
    <div className={"tc-root flex items-center justify-center p-4 sm:p-8" + (theme === "dark" ? " tc-dark" : "")}>
      <style>{CSS}</style>
      <div className="tc-card p-6 sm:p-8" style={{ maxWidth: 440, textAlign: "center" }}>
        <Trophy size={28} style={{ color: "var(--amber)", margin: "0 auto" }} />
        <h2 className="tc-display mt-3" style={{ fontSize: 26, fontWeight: 700 }}>
          {sub === "past_due" ? "Your payment needs attention" : "Your free trial has ended"}
        </h2>
        <p className="mt-2" style={{ color: "var(--ink-soft)" }}>
          Subscribe to keep your training plan, live Strava sync, and progress. Your data is saved — it comes right back.
        </p>
        <button className="tc-btn tc-btn-primary w-full py-3 text-base mt-5" onClick={onSubscribe}>Subscribe</button>
        <button className="tc-btn tc-btn-ghost w-full py-2 text-sm mt-2" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}

function TrialBanner({ trialEndsAt, sub, onSubscribe }) {
  if (sub === "active" || sub === "trialing" || !trialEndsAt) return null;
  const days = Math.ceil((trialEndsAt.getTime() - Date.now()) / 864e5);
  if (days > 30) return null;
  return (
    <div className="tc-card p-2.5 mb-3 flex items-center justify-between gap-2 flex-wrap"
      style={{ background: "var(--amber-soft)", borderColor: "transparent" }}>
      <span className="text-sm" style={{ color: "var(--ink)" }}>
        {days > 0 ? days + (days === 1 ? " day" : " days") + " left in your free trial" : "Your free trial has ended"}
      </span>
      <button className="tc-btn tc-btn-primary px-3 py-1.5 text-sm" onClick={onSubscribe}>Subscribe</button>
    </div>
  );
}

export default function EnduranceCoach() {
  // Restore a committed plan (settings) and the setup form (draft) from last time.
  const [settings, setSettings] = useState(() => LS.get("ec_settings_v1", null));
  const [draft, setDraft] = useState(() => ({
    raceDate: key(addDays(new Date(), 7 * 20)),
    ...DEFAULT_DRAFT,
    ...LS.get("ec_draft_v1", {}),
  }));
  const [localActs, setLocalActs] = useState([]);
  const live = useLiveActivities();
  const synced = !!live.athleteId;
  const activities = synced ? live.activities : localActs;
  const [fileUnit, setFileUnit] = useState("mi");
  const [toast, setToast] = useState(null);
  const [manual, setManual] = useState({ date: key(new Date()), sport: "run", min: "", dist: "" });
  const [weekModes, setWeekModes] = useState({});
  const [theme, setTheme] = useState("light");
  const [openSec, setOpenSec] = useState("about"); // setup-form: which section is expanded (one at a time)
  const [expandedDay, setExpandedDay] = useState(null); // this-week: which day's full workout is expanded
  const fileRef = useRef(null);
  const seen = useRef(new Set());
  const tunedRef = useRef(false);

  // --- Auth + access gate (login + 30-day trial / subscription) ---
  const user = live.user;
  const [access, setAccess] = useState(null);       // null = checking, true/false
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [subStatus, setSubStatus] = useState(null);
  useEffect(() => {
    if (!supabase || !user) { setAccess(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("billing")
        .select("trial_started_at, subscription_status, current_period_end, comped")
        .eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      const tEnd = data?.trial_started_at ? new Date(new Date(data.trial_started_at).getTime() + 30 * 864e5) : null;
      const ok = !!data && (data.comped || ["active", "trialing"].includes(data.subscription_status) || (tEnd && Date.now() < tEnd.getTime()));
      setTrialEndsAt(tEnd); setSubStatus(data?.subscription_status ?? null); setAccess(ok);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const startCheckout = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke("create-checkout-session", { body: {} });
    if (error || !data?.url) { setToast("Could not start checkout — try again."); setTimeout(() => setToast(null), 4000); return; }
    window.location.href = data.url;
  };

  const plan = useMemo(() => (settings ? generatePlan(settings) : null), [settings]);
  const stats = useMemo(() => computeStats(activities), [activities]);
  const todayKey = key(strip(new Date()));
  const currentWeek = plan?.weeks.find((w) => todayKey >= key(w.start) && todayKey <= key(addDays(w.start, 6)));
  const profile = useMemo(() => profileOf(settings || draft), [settings, draft]);
  const read = useMemo(() => coachRead(activities, stats, (settings || draft).raceType, (settings || draft).raceDate, profile),
    [activities, stats, settings, draft.raceType, draft.raceDate, profile]);
  const vo2 = useMemo(() => vo2Read(activities, profile), [activities, profile]);
  const recs = useMemo(() => buildRecs(stats, plan, currentWeek, settings), [stats, plan, currentWeek, settings]);
  const game = useMemo(() => computeGame(activities, plan, read, (settings || draft).raceType),
    [activities, plan, read, settings, draft.raceType]);

  const addActivities = (list, label, onSetup) => {
    const fresh = list.filter((a) => {
      const id = a.key + "|" + a.sport + "|" + a.hours.toFixed(2);
      if (seen.current.has(id)) return false;
      seen.current.add(id); return true;
    });
    const next = [...localActs, ...fresh];
    const beforeXP = seasonXP(localActs), afterXP = seasonXP(next);
    const gained = afterXP - beforeXP;
    const leveled = levelOf(afterXP) > levelOf(beforeXP);
    setLocalActs(next);
    if (onSetup && fresh.length) {
      const r = coachRead(next, computeStats(next), draft.raceType, draft.raceDate, profile);
      if (r) setDraft((d) => ({ ...d, weeklyHours: r.derived.weeklyHours, daysPerWeek: r.derived.daysPerWeek, weakest: r.derived.weakest }));
      setToast(label + ": " + fresh.length + " sessions in — setup tuned from your data" + (gained ? " · +" + gained + " XP" : ""));
    } else if (leveled) {
      setToast("LEVEL UP — " + LEVELS[levelOf(afterXP)].t + " · +" + gained + " XP");
    } else {
      setToast(fresh.length ? label + ": +" + fresh.length + " session" + (fresh.length > 1 ? "s" : "") + (gained ? " · +" + gained + " XP" : "") : "Those sessions were already logged");
    }
    setTimeout(() => setToast(null), 4000);
  };

  const onFile = (onSetup) => (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    Papa.parse(f, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const r = rowsToActivities(res.data, res.meta.fields || [], fileUnit);
        if (r.error) { setToast(r.error); setTimeout(() => setToast(null), 5500); }
        else addActivities(r.activities, "Import", onSetup);
      },
    });
    e.target.value = "";
  };

  // Real Strava: the OAuth URL comes from the hook (built from your backend's
  // function URL). Clicking the connect button is an <a href={connectUrl}> below.
  const disconnectStrava = () => {
    live.disconnect();
    setToast("Strava disconnected on this device.");
    setTimeout(() => setToast(null), 3500);
  };
  // After returning from Strava OAuth, prefill the setup form from real data once.
  useEffect(() => {
    if (settings || tunedRef.current) return;
    if (synced && live.activities.length && read) {
      tunedRef.current = true;
      setDraft((d) => ({ ...d, weeklyHours: read.derived.weeklyHours, daysPerWeek: read.derived.daysPerWeek, weakest: read.derived.weakest }));
      setToast("Strava connected · " + live.activities.length + " sessions synced · setup tuned to your data");
      setTimeout(() => setToast(null), 4200);
    }
  }, [synced, live.activities, read, settings]);

  // Persist the setup form and the committed plan so reopening restores them.
  useEffect(() => { LS.set("ec_draft_v1", draft); }, [draft]);
  useEffect(() => { LS.set("ec_settings_v1", settings); }, [settings]);

  const loggedByDaySport = useMemo(() => {
    const m = {};
    activities.forEach((a) => {
      m[a.key] = m[a.key] || {};
      m[a.key][a.sport] = (m[a.key][a.sport] || 0) + a.hours;
    });
    return m;
  }, [activities]);

  const adjust = stats?.status === "high" ? 0.75 : stats?.status === "elevated" ? 0.9 : 1;

  const chartData = useMemo(() => {
    if (!plan) return [];
    const rows = [];
    const firstAct = activities.length ? monday(new Date(activities.map((a) => a.key).sort()[0] + "T12:00:00")) : plan.weeks[0].start;
    const startW = firstAct < plan.weeks[0].start ? firstAct : plan.weeks[0].start;
    const endW = addDays(plan.weeks[0].start, 7 * Math.min(plan.totalWeeks - 1, Math.max(5, (currentWeek?.i || 0) + 3)));
    for (let t = startW.getTime(); t <= endW.getTime(); t += 7 * DAY) {
      const ws = new Date(t);
      const wk = key(ws), wkEnd = key(addDays(ws, 6));
      const sum = (sp) => +activities.filter((a) => a.sport === sp && a.key >= wk && a.key <= wkEnd)
        .reduce((s, a) => s + a.hours, 0).toFixed(2);
      const pw = plan.weeks.find((w) => key(w.start) === wk);
      const past = ws <= strip(new Date());
      rows.push({
        label: fmtDate(ws),
        Swim: past ? sum("swim") : null, Bike: past ? sum("bike") : null,
        Run: past ? sum("run") : null, Strength: past ? sum("strength") : null,
        Planned: pw ? pw.target : null,
      });
    }
    return rows.slice(-12);
  }, [plan, activities, currentWeek]);

  // --- Gate: public landing → login → trial/subscription → the app ---
  if (live.configured) {
    if (!live.authReady) return <Splash theme={theme} label="Loading…" />;
    if (!user) return <Landing theme={theme} />;
    if (access === null) return <Splash theme={theme} label="Checking your access…" />;
    if (!access) return <Paywall theme={theme} sub={subStatus} onSubscribe={startCheckout} onSignOut={authSignOut} />;
  }

  /* ----------------------------- Setup ----------------------------- */
  if (!settings) {
    const cfg = RACES[draft.raceType];
    const weeksOut = Math.round((strip(new Date(draft.raceDate + "T12:00:00")) - strip(new Date())) / (7 * DAY));
    return (
      <div className={"tc-root flex items-center justify-center p-4 sm:p-8" + (theme === "dark" ? " tc-dark" : "")}>
        <style>{CSS}</style>
        <div className="w-full max-w-xl">
          <TrialBanner trialEndsAt={trialEndsAt} sub={subStatus} onSubscribe={startCheckout} />
          <div className="flex items-center justify-between">
            <div className="tc-eyebrow mb-2" style={{ color: "var(--orange)" }}>Adaptive endurance coach · evidence-based</div>
            <button className="tc-btn tc-btn-ghost p-2" title="Toggle light / dark" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <h1 className="tc-display" style={{ fontSize: "clamp(40px,7vw,64px)", fontWeight: 700, lineHeight: 0.95 }}>
            Pick a start line.<br />Train around your life.
          </h1>
          <p className="mt-3 mb-6" style={{ color: "var(--ink-soft)", maxWidth: 480 }}>
            Ironman to HYROX to Spartan — one engine, tuned per race, built on published training science. Import your watch history and it starts from who you actually are.
          </p>

          <div className="tc-card p-4 mb-4" style={{ borderStyle: "dashed" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="tc-eyebrow" style={{ color: "var(--steel)" }}>Start with your data (recommended)</div>
                <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
                  {activities.length ? activities.length + " sessions loaded — fields tuned automatically" : "Live Strava sync, or a Garmin/Strava CSV — distance + HR unlock VO2max"}
                </div>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                {synced ? (
                  <span className="tc-chip flex items-center gap-1.5" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
                    <span className="tc-live-dot" /> Strava connected
                  </span>
                ) : live.configured ? (
                  <a className="tc-btn px-3 py-2 inline-flex items-center gap-1.5 text-sm" style={{ background: "#FC4C02", color: "#fff" }} href={live.connectUrl}>
                    <Radio size={15} /> Connect with Strava
                  </a>
                ) : (
                  <span className="tc-chip" style={{ background: "rgba(22,35,56,.10)", color: "var(--ink-soft)" }} title="Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to enable">Strava: configure backend</span>
                )}
                <select className="tc-input px-2 py-2 text-sm" value={fileUnit} onChange={(e) => setFileUnit(e.target.value)} title="Distance unit in the file">
                  <option value="mi">file in mi</option><option value="km">file in km</option>
                </select>
                <button className="tc-btn tc-btn-ghost px-3 py-2 flex items-center gap-1.5 text-sm" onClick={() => fileRef.current?.click()}>
                  <Upload size={15} /> CSV
                </button>
                <button className="tc-btn tc-btn-ghost px-3 py-2 text-sm" onClick={() => addActivities(demoActivities(), "Demo", true)}>Demo</button>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFile(true)} />
              </div>
            </div>
            {read && (
              <div className="mt-3 flex flex-col gap-2">
                {read.benchmarks.map((b, i) => <BenchBar key={i} b={b} />)}
                {read.verdict && (
                  <div className="text-sm mt-1 flex gap-2 items-start">
                    <span className="tc-chip" style={{ background: TONE[read.verdict.tone], color: "#fff" }}>{read.verdict.label}</span>
                    <span style={{ color: "var(--ink-soft)" }}>{read.verdict.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="tc-card p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Your race" hint={cfg.legs}>
              <select className="tc-input w-full px-3 py-2" value={draft.raceType}
                onChange={(e) => setDraft({ ...draft, raceType: e.target.value })}>
                {RACE_GROUPS.map(([group, ids]) => (
                  <optgroup key={group} label={group}>
                    {ids.map((id) => <option key={id} value={id}>{RACES[id].name}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Race date" hint={weeksOut > 0 ? weeksOut + " weeks out" : "Pick a future date"}>
              <input type="date" className="tc-input w-full px-3 py-2" value={draft.raceDate}
                onChange={(e) => setDraft({ ...draft, raceDate: e.target.value })} />
            </Field>

            <button type="button" className="sm:col-span-2 tc-eyebrow flex items-center justify-between" style={{ border: "none", borderTop: "1px solid var(--line)", background: "transparent", paddingTop: 12, cursor: "pointer" }} onClick={() => setOpenSec(openSec === "about" ? "" : "about")}>
              About you
              <ChevronDown size={14} style={{ transform: openSec === "about" ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {openSec === "about" && (<>
            <Field label="Age" hint={profile.maxHR ? "Z2 ≈ " + profile.z2[0] + "–" + profile.z2[1] + "bpm (Tanaka est. max " + profile.maxHR + ")" : "Sets your heart-rate zones"}>
              <input type="number" min="16" max="80" className="tc-input w-full px-3 py-2 tc-mono" value={String(draft.age).replace(/^0+(?=\d)/, "")}
                onChange={(e) => setDraft({ ...draft, age: +e.target.value })} />
            </Field>
            <Field label="Weight" hint={profile.carbs ? "Sizes fueling: ~" + profile.carbs + "g carbs/hr on long sessions" : "Used only to size fueling targets"}>
              <div className="flex gap-2">
                <input type="number" min="70" max="400" className="tc-input px-3 py-2 tc-mono flex-1" value={String(draft.weight).replace(/^0+(?=\d)/, "")}
                  onChange={(e) => setDraft({ ...draft, weight: +e.target.value })} />
                {["lb", "kg"].map((u) => (
                  <button key={u} className="tc-btn tc-btn-ghost px-3 py-2"
                    style={draft.wUnit === u ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}}
                    onClick={() => {
                      if (u === draft.wUnit) return;
                      const w = u === "kg" ? Math.round(draft.weight * 0.4536) : Math.round(draft.weight / 0.4536);
                      setDraft({ ...draft, wUnit: u, weight: w });
                    }}>{u}</button>
                ))}
              </div>
            </Field>
            <Field label="Resting HR (optional)" hint="Sharpens the HR-based VO2max estimate">
              <input type="number" min="30" max="100" placeholder="58" className="tc-input w-full px-3 py-2 tc-mono" value={String(draft.rhr).replace(/^0+(?=\d)/, "")}
                onChange={(e) => setDraft({ ...draft, rhr: e.target.value })} />
            </Field>
            <Field label="Sex (optional)" hint="Only used for VO2max age norms">
              <div className="flex gap-2">
                {[["F", "F"], ["M", "M"], ["", "—"]].map(([v, lab]) => (
                  <button key={lab} className="tc-btn tc-btn-ghost px-3 py-2 flex-1"
                    style={draft.sex === v ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}}
                    onClick={() => setDraft({ ...draft, sex: v })}>{lab}</button>
                ))}
              </div>
            </Field>

            </>)}
            <button type="button" className="sm:col-span-2 tc-eyebrow flex items-center justify-between" style={{ border: "none", borderTop: "1px solid var(--line)", background: "transparent", paddingTop: 12, cursor: "pointer" }} onClick={() => setOpenSec(openSec === "week" ? "" : "week")}>
              Your week
              <ChevronDown size={14} style={{ transform: openSec === "week" ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {openSec === "week" && (<>
            <Field label="Current training (hrs/week)" hint={read ? "From your data" : "Everything combined"}>
              <input type="number" min="2" max="20" step="0.5" className="tc-input w-full px-3 py-2 tc-mono" value={String(draft.weeklyHours).replace(/^0+(?=\d)/, "")}
                onChange={(e) => setDraft({ ...draft, weeklyHours: +e.target.value })} />
            </Field>
            <Field label="Training days per week" hint={read ? "From your data" : "Quality over quantity"}>
              <div className="flex gap-2">
                {[4, 5, 6, 7].map((n) => (
                  <button key={n} className="tc-btn tc-btn-ghost px-3 py-2 flex-1"
                    style={draft.daysPerWeek === n ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}}
                    onClick={() => setDraft({ ...draft, daysPerWeek: n })}>{n}</button>
                ))}
              </div>
            </Field>
            <Field label="Weekday session cap" hint="Longest session that fits a workday — weekends absorb the rest">
              <div className="flex gap-2">
                {[45, 60, 75, 90].map((m) => (
                  <button key={m} className="tc-btn tc-btn-ghost px-2 py-2 flex-1"
                    style={draft.capMin === m ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}}
                    onClick={() => setDraft({ ...draft, capMin: m })}>{m}m</button>
                ))}
              </div>
            </Field>
            {cfg.family === "tri" ? (
              <Field label="Weakest discipline" hint={read ? "From your data: lowest race-readiness" : "Gets the extra weekday session"}>
                <div className="flex gap-2">
                  {["swim", "bike", "run"].map((sp) => {
                    const I = SPORT_META[sp].icon;
                    return (
                      <button key={sp} className="tc-btn tc-btn-ghost px-3 py-2 flex-1 flex items-center justify-center gap-1.5"
                        style={draft.weakest === sp ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}}
                        onClick={() => setDraft({ ...draft, weakest: sp })}>
                        <I size={15} /> {sp}
                      </button>
                    );
                  })}
                </div>
              </Field>
            ) : (
              <Field label="Goal time (optional)" hint="h:mm — or chase the finish line">
                <input type="text" placeholder="1:25" className="tc-input w-full px-3 py-2 tc-mono" value={draft.goalTime}
                  onChange={(e) => setDraft({ ...draft, goalTime: e.target.value })} />
              </Field>
            )}
            </>)}
            <div className="sm:col-span-2" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <button type="button" className="w-full flex items-center justify-between"
                onClick={() => setDraft({ ...draft, lifts: !draft.lifts })}>
                <span className="flex items-center gap-2">
                  <Dumbbell size={16} style={{ color: draft.lifts ? "var(--ink)" : "var(--ink-soft)" }} />
                  <span className="tc-display" style={{ fontSize: 18, fontWeight: 600 }}>I lift weights — keep it in the plan</span>
                </span>
                <span className="tc-chip" style={{ background: draft.lifts ? "var(--ink)" : "rgba(22,35,56,.10)", color: draft.lifts ? "#fff" : "var(--ink-soft)" }}>{draft.lifts ? "ON" : "OFF"}</span>
              </button>
              {draft.lifts && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <Field label="Lift days / week" hint="Protected gym sessions, stacked onto hard days">
                    <div className="flex gap-2">
                      {[2, 3, 4].map((n) => (
                        <button key={n} className="tc-btn tc-btn-ghost px-3 py-2 flex-1"
                          style={draft.liftDays === n ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}}
                          onClick={() => setDraft({ ...draft, liftDays: n })}>{n}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Emphasis" hint="Heavy lower-body is kept off the day before key runs">
                    <div className="flex gap-2">
                      {[["full", "Full body"], ["lower", "Lower"], ["upper", "Upper"]].map(([v, lab]) => (
                        <button key={v} className="tc-btn tc-btn-ghost px-2 py-2 flex-1"
                          style={draft.liftFocus === v ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}}
                          onClick={() => setDraft({ ...draft, liftFocus: v })}>{lab}</button>
                      ))}
                    </div>
                  </Field>
                  <p className="sm:col-span-2 text-xs flex items-start gap-1.5" style={{ color: "var(--ink-soft)" }}>
                    <Dumbbell size={13} style={{ flexShrink: 0, marginTop: 2 }} /> Lifts taper toward race day and back off in recovery weeks — concurrent-training science, so the gym helps your race instead of fighting it.
                  </p>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <button className="tc-btn tc-btn-primary w-full py-3 text-lg"
                onClick={() => {
                  if (weeksOut < 1) { setToast("Race date needs to be in the future."); setTimeout(() => setToast(null), 4000); return; }
                  setSettings({ ...draft });
                }}>
                Build my plan
              </button>
              {weeksOut > 0 && weeksOut < cfg.minWeeks && (
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--amber)" }}>
                  <AlertTriangle size={13} /> {weeksOut} weeks is tight for {cfg.name} — the plan will prioritize the key sessions and arriving healthy.
                </p>
              )}
            </div>
          </div>
          {toast && (
            <div className="mt-3 text-sm px-3 py-2 rounded-lg inline-block" style={{ background: "var(--ink)", color: "#fff" }}>{toast}</div>
          )}
        </div>
      </div>
    );
  }

  /* --------------------------- Dashboard --------------------------- */
  const cfg = plan.cfg;
  const axisTick = theme === "dark" ? "#9CADC4" : "#5A6A82";
  const tipStyle = { borderRadius: 12, border: "1px solid " + (theme === "dark" ? "rgba(255,255,255,.14)" : "rgba(22,35,56,.12)"), background: theme === "dark" ? "rgba(18,24,36,.86)" : "rgba(255,255,255,.92)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", color: theme === "dark" ? "#EAF0F8" : "#162338", fontFamily: "Barlow", fontSize: 12 };
  const tipLabel = { color: theme === "dark" ? "#EAF0F8" : "#162338" };
  const daysToRace = Math.max(0, Math.round((plan.race - strip(new Date())) / DAY));
  const readiness = {
    baseline: { label: "Building baseline", color: "var(--steel)", soft: "var(--steel-soft)" },
    fresh: { label: "Fresh", color: "var(--steel)", soft: "var(--steel-soft)" },
    optimal: { label: "In the zone", color: "var(--green)", soft: "var(--green-soft)" },
    elevated: { label: "Load climbing", color: "var(--amber)", soft: "var(--amber-soft)" },
    high: { label: "Back off", color: "var(--red)", soft: "var(--orange-soft)" },
  }[stats?.status || "baseline"];

  const curKey = currentWeek ? key(currentWeek.start) : null;
  const mode = (curKey && weekModes[curKey]) || "normal";
  const showModes = currentWeek && currentWeek.phase !== "Race week";
  const { days: modeDays, note: modeNote } = applyWeekMode(currentWeek?.days || [], showModes ? mode : "normal");
  const weekTarget = modeDays.reduce((s, d) => s + (d.hours || 0), 0);
  const weekDone = modeDays.reduce((s, d) => {
    const logged = loggedByDaySport[key(d.date)] || {};
    return s + Math.min(d.hours || 0, d.sports.reduce((x, sp) => x + (logged[sp] || 0), 0));
  }, 0);
  const weekPct = weekTarget ? Math.min(100, Math.round((weekDone / weekTarget) * 100)) : 0;
  const MIX_COLORS = { swim: "var(--steel)", bike: "var(--orange)", run: "var(--green)", strength: "var(--amber)" };
  const wkStartKey = key(monday(strip(new Date())));
  const daysThisWeek = new Set(activities.filter((a) => a.key >= wkStartKey).map((a) => a.key)).size;
  const dayGoal = settings.daysPerWeek || 5;
  const lvlPct = game.next ? (game.xp - LEVELS[game.lvl].xp) / (game.next.xp - LEVELS[game.lvl].xp) : 1;
  const rings = [
    { label: "Move", color: "var(--orange)", pct: weekTarget ? weekDone / weekTarget : 0, value: fmtHM(weekDone), detail: "of " + fmtHM(weekTarget) + " planned this week" },
    { label: "Sessions", color: "var(--green)", pct: Math.min(1, daysThisWeek / dayGoal), value: daysThisWeek + "/" + dayGoal, detail: "training days hit this week" },
    { label: "Level", color: "var(--amber)", pct: lvlPct, value: "Lv " + (game.lvl + 1), detail: game.next ? (game.next.xp - game.xp) + " XP to level up" : "max level reached" },
  ];

  return (
    <div className={"tc-root" + (theme === "dark" ? " tc-dark" : "")}>
      <style>{CSS}</style>
      <div className="max-w-5xl mx-auto p-4 sm:p-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="tc-eyebrow" style={{ color: "var(--orange)" }}>
              Road to race day · {cfg.name} · {fmtDate(plan.race)}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="tc-display" style={{ fontSize: "clamp(56px,9vw,88px)", fontWeight: 700, lineHeight: 1 }}>{daysToRace}</span>
              <span className="tc-display" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink-soft)" }}>DAYS TO GO</span>
            </div>
          </div>
          <div className="flex gap-2 items-center pt-2 flex-wrap">
            <span className="tc-chip" style={{ background: "var(--steel)", color: "#fff" }}>Lv {game.lvl + 1} · {game.title}</span>
            {settings.goalTime && (
              <span className="tc-chip" style={{ background: "var(--ink)", color: "#fff" }}>Goal {settings.goalTime}</span>
            )}
            <span className="tc-chip" style={{ background: "var(--orange-soft)", color: "var(--orange)" }}>{cfg.legs}</span>
            {synced && (
              <span className="tc-chip flex items-center gap-1.5" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
                <span className="tc-live-dot" /> Strava live
              </span>
            )}
            <button className="tc-btn tc-btn-ghost p-2" title="Toggle light / dark"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="tc-btn tc-btn-ghost p-2" title="Edit setup"
              onClick={() => { setDraft({ ...settings }); setSettings(null); }}>
              <Settings size={18} />
            </button>
            <button className="tc-btn tc-btn-ghost px-3 py-2 text-sm" title="Sign out" onClick={() => authSignOut()}>Sign out</button>
          </div>
        </div>

        <TrialBanner trialEndsAt={trialEndsAt} sub={subStatus} onSubscribe={startCheckout} />
        <div className="mt-3 mb-5"><CourseLine plan={plan} /></div>

        <FormRings rings={rings} />

        {/* Coach's read */}
        {read && (
          <details className="tc-details tc-card p-4 sm:p-5 mb-4" name="dash" open>
            <summary className="flex items-center justify-between mb-3 flex-wrap gap-2" style={{ cursor: "pointer" }}>
              <span className="tc-eyebrow">Coach's read · last 60 days vs what {cfg.short} demands</span>
              <span className="flex items-center gap-2">
                {read.verdict && <span className="tc-chip" style={{ background: TONE[read.verdict.tone], color: "#fff" }}>{read.verdict.label}</span>}
                <ChevronDown size={16} style={{ color: "var(--ink-soft)" }} />
              </span>
            </summary>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="flex flex-col gap-3">
                {read.benchmarks.map((b, i) => <BenchBar key={i} b={b} />)}
                {read.verdict && <div className="text-sm" style={{ color: "var(--ink-soft)" }}>{read.verdict.text}</div>}
              </div>
              <div className="flex flex-col gap-3">
                {read.insights.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <div key={i} className="flex gap-2.5 text-sm leading-snug">
                      <Icon size={16} style={{ color: TONE[r.tone], flexShrink: 0, marginTop: 2 }} />
                      <span>{r.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        )}

        {/* VO2max analysis */}
        <details className="tc-details tc-card p-4 sm:p-5 mb-4" name="dash">
          <summary className="flex items-center justify-between flex-wrap gap-2" style={{ cursor: "pointer" }}>
            <span className="tc-eyebrow flex items-center gap-1.5"><Wind size={14} /> VO2max analysis · performance-derived (VDOT)</span>
            <span className="flex items-center gap-2">
              {vo2 && vo2.rating && <span className="tc-chip" style={{ background: TONE[vo2.rating.tone], color: "#fff" }}>{vo2.rating.label} for age (approx.)</span>}
              <ChevronDown size={16} style={{ color: "var(--ink-soft)" }} />
            </span>
          </summary>
          {vo2 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="tc-display" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1 }}>{vo2.vdot.toFixed(1)}</span>
                  <span className="tc-eyebrow">ml/kg/min</span>
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--ink-soft)" }}>
                  From your best recent effort: {vo2.best.distMi.toFixed(1)} mi in {fmtClock(vo2.best.hours)} (Daniels–Gilbert), {vo2.n} runs analyzed.
                  {vo2.hrEst && <span> HR-based cross-check: <span className="tc-mono">{vo2.hrEst.toFixed(1)}</span>.</span>}
                  {vo2.extrapolated && " Short best effort — treat longer predictions loosely."}
                </div>
                <div className="text-sm mt-3 p-2.5 rounded-lg" style={{ background: "var(--steel-soft)" }}>
                  <strong>Raise it:</strong> 1–2×/wk, 4×4min @ {profile.z45 ? profile.z45[0] + "–" + profile.z45[1] + "bpm" : "90–95% HRmax"}, 3min jog recoveries (Helgerud 2007). Already on your quality days.
                </div>
              </div>
              <div>
                <div className="tc-eyebrow mb-2">Equivalent race times (Riegel)</div>
                <div className="flex flex-col gap-1.5">
                  {vo2.preds.map((p) => (
                    <div key={p.label} className="flex justify-between text-sm" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
                      <span>{p.label}</span><span className="tc-mono">{fmtClock(p.time)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="tc-eyebrow mb-1">Trend · per-run estimates</div>
                <div style={{ width: "100%", height: 150 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={vo2.trend} margin={{ top: 6, right: 6, left: -26, bottom: 0 }}>
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisTick }} axisLine={false} tickLine={false} />
                      <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10, fill: axisTick }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tipStyle} labelStyle={tipLabel} />
                      <Line dataKey="VDOT" stroke="#3D6B8E" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>
              Needs runs with <strong>distance</strong> (and ideally avg HR) — import a Garmin/Strava CSV with those columns, or log runs with distance below. Estimates use the Daniels–Gilbert performance model, so an honest hard effort (a 5K, a parkrun) makes it accurate.
            </div>
          )}
        </details>

        {/* Climb to the pros — Olympic specs, broken into rungs */}
        <details className="tc-details tc-card p-4 sm:p-5 mb-4" name="dash">
          <summary className="flex items-center justify-between flex-wrap gap-2" style={{ cursor: "pointer" }}>
            <span className="tc-eyebrow flex items-center gap-1.5"><Mountain size={14} /> Climb to the pros · Olympic specs, broken into your next rung</span>
            <span className="flex items-center gap-2">
              <span className="tc-chip" style={{ background: "var(--ink)", color: "#fff" }}>{cfg.name}</span>
              <ChevronDown size={16} style={{ color: "var(--ink-soft)" }} />
            </span>
          </summary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5 mt-4">
            <LadderBar L={vo2Ladder(profile.sex)} value={vo2 ? vo2.vdot : null} />
            <LadderBar L={FIVEK_LADDER} value={vo2 ? vo2.preds.find((p) => p.label === "5K").time * 60 : null} />
          </div>
          {(() => {
            const spec = eliteSpec(settings.raceType);
            return (
              <div className="mt-5 p-3 rounded-xl" style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
                <div className="tc-eyebrow mb-1" style={{ color: "var(--orange)" }}>What elite looks like in your race</div>
                <div className="text-sm">{spec.line}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                  {spec.facts.map((f, i) => (
                    <div key={i} className="text-xs flex gap-1.5" style={{ color: "var(--ink-soft)" }}>
                      <Star size={12} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }} /><span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="text-sm mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                  <strong>Scaled to your life:</strong> pros train 25–35h/week with daily doubles. Your plan peaks at <span className="tc-mono">{fmtHM(plan.peak)}/wk</span> — same physiology, a fraction of the time, because every session is spent only where it moves the needle. Same ladder. Realistic rungs.
                </div>
              </div>
            );
          })()}
        </details>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* This week */}
          <div className="lg:col-span-3 tc-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <div className="tc-eyebrow">This week · {currentWeek ? currentWeek.phase : "—"}</div>
                <div className="tc-display" style={{ fontSize: 26, fontWeight: 700 }}>
                  {currentWeek ? fmtHM(q25(weekTarget * adjust)) : "—"} planned
                  {adjust < 1 && <span className="text-sm font-normal" style={{ color: "var(--amber)" }}>  (auto-reduced {Math.round((1 - adjust) * 100)}%)</span>}
                </div>
              </div>
              {showModes && (
                <div className="flex gap-1.5 flex-wrap">
                  {[["normal", "Normal", Activity], ["slammed", "Slammed", Briefcase], ["travel", "Travel", Plane]].map(([m, lab, I]) => (
                    <button key={m} className="tc-btn tc-btn-ghost px-2.5 py-1.5 text-xs flex items-center gap-1"
                      style={mode === m ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}}
                      onClick={() => setWeekModes({ ...weekModes, [curKey]: m })}>
                      <I size={13} /> {lab}
                    </button>
                  ))}
                  <button className="tc-btn tc-btn-ghost px-2.5 py-1.5 text-xs flex items-center gap-1"
                    title={settings.lifts ? "Lifting on — tap to remove from plan" : "Adapt the plan around weightlifting"}
                    style={settings.lifts ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : {}}
                    onClick={() => setSettings({ ...settings, lifts: !settings.lifts })}>
                    <Dumbbell size={13} /> Lifting{settings.lifts ? " · " + settings.liftDays + "×" : ""}
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1" style={{ height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}>
                <div className="tc-fill" style={{ width: weekPct + "%", height: "100%", background: "var(--orange)", borderRadius: 4 }} />
              </div>
              <span className="tc-mono text-xs" style={{ color: "var(--ink-soft)", minWidth: 90, textAlign: "right" }}>{fmtHM(weekDone)} / {fmtHM(weekTarget)}</span>
            </div>
            {modeNote && <div className="text-xs mb-2 px-3 py-2 rounded-lg" style={{ background: "var(--amber-soft)", color: "var(--ink)" }}>{modeNote}</div>}
            <div className="grid grid-cols-1 gap-2">
              {modeDays.map((d, i) => {
                const meta = SPORT_META[d.type] || SPORT_META.rest;
                const isToday = key(d.date) === todayKey;
                const logged = loggedByDaySport[key(d.date)] || {};
                const loggedHrs = d.sports.reduce((s, sp) => s + (logged[sp] || 0), 0);
                const due = key(d.date) <= todayKey && d.type !== "rest" && d.type !== "race";
                const done = due && d.hours && loggedHrs >= d.hours * 0.6;
                const missed = due && !done && key(d.date) < todayKey;
                const shownHrs = d.hours ? q25(d.hours * (d.type === "race" ? 1 : adjust)) : d.hours;
                const dk = key(d.date);
                const isOpen = expandedDay === dk;
                return (
                  <div key={i} onClick={() => setExpandedDay(isOpen ? null : dk)} className={"flex gap-3 p-2.5 rounded-xl cursor-pointer " + (isOpen ? "items-start" : "items-center")}
                    style={{ background: isToday ? "var(--paper)" : "transparent", border: isToday ? "1.5px solid var(--ink)" : "1px solid var(--line)" }}>
                    <div className="tc-display text-center" style={{ width: 42 }}>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>{DOW[(d.date.getDay() + 6) % 7]}</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{d.date.getDate()}</div>
                    </div>
                    <span className="tc-chip flex items-center gap-1 justify-center" style={{ background: meta.bg, color: meta.fg, minWidth: 70 }}>
                      {meta.label}
                    </span>
                    {d.lift && (
                      <span className="tc-chip flex items-center gap-0.5" style={{ background: "var(--ink)", color: "#fff" }} title={"Lift: " + d.lift.sub}>
                        +LIFT
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={"font-medium" + (isOpen ? "" : " truncate")}>
                        {d.title}{shownHrs > 0 && <span className="tc-mono text-sm">  · {fmtHM(shownHrs)}</span>}
                      </div>
                      <div className={"text-xs" + (isOpen ? "" : " truncate")} style={{ color: "var(--ink-soft)" }}>{d.sub}{!isOpen && d.lift ? "  ＋ then lift: " + d.lift.sub : ""}</div>
                      {isOpen && d.lift && (
                        <div className="text-xs mt-1 flex items-start gap-1.5" style={{ color: "var(--ink-soft)" }}>
                          <Dumbbell size={12} style={{ flexShrink: 0, marginTop: 2 }} /> Then lift: {d.lift.sub}
                        </div>
                      )}
                    </div>
                    {done && <span className="tc-mono text-xs" style={{ color: "var(--green)" }}>+{Math.round((d.hours || 0) * 100)}</span>}
                    {done && <CheckCircle2 size={18} style={{ color: "var(--green)" }} title={"Logged " + fmtHM(loggedHrs)} />}
                    {missed && <span className="text-xs" style={{ color: "var(--ink-soft)" }}>missed</span>}
                    <ChevronDown size={15} style={{ color: "var(--ink-soft)", flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right rail */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="tc-card p-4 sm:p-5" style={{ background: readiness.soft, borderColor: "transparent" }}>
              <div className="flex items-center justify-between">
                <div className="tc-eyebrow" style={{ color: readiness.color }}>Readiness · ACWR</div>
                <Zap size={16} style={{ color: readiness.color }} />
              </div>
              <div className="tc-display" style={{ fontSize: 30, fontWeight: 700, color: readiness.color }}>{readiness.label}</div>
              {stats && stats.ratio != null && stats.status !== "baseline" ? (
                <div className="text-sm mt-1" style={{ color: "var(--ink)" }}>
                  7-day load is <span className="tc-mono font-medium">{stats.ratio.toFixed(2)}×</span> your 4-week norm
                  <span style={{ color: "var(--ink-soft)" }}> · {fmtHM(stats.hours7)} this week vs {fmtHM(stats.hours28 / 4)}/wk avg</span>
                </div>
              ) : (
                <div className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>Import sessions to unlock load tracking.</div>
              )}
              {stats && stats.mixTotal > 0 && (
                <div className="flex mt-3" style={{ height: 8, borderRadius: 4, overflow: "hidden" }} title="Last 4 weeks: swim / bike / run / strength">
                  {["swim", "bike", "run", "strength"].map((sp) => (
                    <div key={sp} style={{ width: (stats.mix[sp] / stats.mixTotal) * 100 + "%", background: MIX_COLORS[sp] }} />
                  ))}
                </div>
              )}
              {stats && stats.mixTotal > 0 && (
                <div className="flex justify-between text-xs mt-1 tc-mono" style={{ color: "var(--ink-soft)" }}>
                  {["swim", "bike", "run", "strength"].map((sp) => (
                    <span key={sp}>{sp === "strength" ? "str" : sp} {Math.round((stats.mix[sp] / stats.mixTotal) * 100)}%</span>
                  ))}
                </div>
              )}
            </div>

            <div className="tc-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="tc-eyebrow">Season · last 90 days</div>
                <Trophy size={15} style={{ color: "var(--amber)" }} />
              </div>
              <div className="tc-display" style={{ fontSize: 24, fontWeight: 700 }}>Lv {game.lvl + 1} — {game.title}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1" style={{ height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}>
                  <div className="tc-fill" style={{ width: (game.next ? Math.min(100, Math.round(((game.xp - LEVELS[game.lvl].xp) / (game.next.xp - LEVELS[game.lvl].xp)) * 100)) : 100) + "%", height: "100%", background: "var(--steel)", borderRadius: 4 }} />
                </div>
                <span className="tc-mono text-xs" style={{ color: "var(--ink-soft)" }}>{game.xp}{game.next ? " / " + game.next.xp : ""} XP</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5"><Flame size={15} style={{ color: game.streak > 0 ? "var(--orange)" : "var(--ink-soft)" }} /><span className="tc-mono">{game.streak}</span>-week streak</span>
                <span className="text-xs" style={{ color: "var(--ink-soft)" }}>3+ sessions keeps it alive</span>
              </div>
              {game.quest && (
                <div className="mt-3 p-2.5 rounded-lg flex items-start gap-2 text-sm" style={{ background: game.quest.done ? "var(--green-soft)" : "var(--steel-soft)" }}>
                  <Target size={15} style={{ color: game.quest.done ? "var(--green)" : "var(--steel)", flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <strong>Weekly quest:</strong> {game.quest.label}
                    <span className="tc-mono" style={{ color: "var(--ink-soft)" }}> (+{game.quest.xp} XP)</span>
                    {game.quest.done && <strong style={{ color: "var(--green)" }}> — done!</strong>}
                  </span>
                </div>
              )}
            </div>

            <div className="tc-card p-4 sm:p-5">
              <div className="tc-eyebrow mb-2">Coach notes</div>
              <div className="flex flex-col gap-3">
                {recs.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <div key={i} className="flex gap-2.5 text-sm leading-snug">
                      <Icon size={16} style={{ color: TONE[r.tone], flexShrink: 0, marginTop: 2 }} />
                      <span>{r.text}</span>
                    </div>
                  );
                })}
              </div>
              <CoachCorner />
            </div>

            <div className="tc-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="tc-eyebrow">Your sessions</span>
                {synced && <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--green)" }}><span className="tc-live-dot" /> {live.status === "loading" ? "syncing…" : live.status === "error" ? "sync error" : "live"}</span>}
              </div>

              {!synced ? (
                <>
                  {live.configured ? (
                    <a className="tc-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm"
                      style={{ background: "#FC4C02", color: "#fff" }} href={live.connectUrl}>
                      <Radio size={16} /> Connect with Strava
                    </a>
                  ) : (
                    <div className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(22,35,56,.08)", color: "var(--ink-soft)" }}>
                      Strava sync needs the backend configured — set <span className="tc-mono">VITE_SUPABASE_URL</span> and <span className="tc-mono">VITE_SUPABASE_ANON_KEY</span> (see README). Until then, import a CSV or log by hand below.
                    </div>
                  )}
                  <div className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>
                    Auto-syncs every watch upload — workouts land here seconds after you stop, no files, no fuss. Garmin and Apple Watch both feed Strava.
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "var(--green-soft)" }}>
                  <span className="flex items-center gap-2 text-sm" style={{ color: "var(--green)" }}>
                    <Link2 size={15} /> Connected — {activities.length} sessions, last 180 days
                  </span>
                  <button className="text-xs" style={{ color: "var(--ink-soft)", textDecoration: "underline" }} onClick={disconnectStrava}>unlink</button>
                </div>
              )}

              <details className="tc-details mt-3">
                <summary className="text-xs flex items-center gap-1" style={{ color: "var(--steel)" }}>
                  <ChevronDown size={13} /> Or import a file / log by hand
                </summary>
                {!synced && (
                  <div className="flex gap-2 flex-wrap items-center mt-2">
                    <button className="tc-btn tc-btn-ghost px-3 py-2 flex items-center gap-1.5 text-sm" onClick={() => fileRef.current?.click()}>
                      <Upload size={15} /> Import CSV
                    </button>
                    <select className="tc-input px-2 py-2 text-sm" value={fileUnit} onChange={(e) => setFileUnit(e.target.value)} title="Distance unit in the file">
                      <option value="mi">file in mi</option><option value="km">file in km</option>
                    </select>
                    <button className="tc-btn tc-btn-ghost px-3 py-2 text-sm" onClick={() => addActivities(demoActivities(), "Demo")}>Demo data</button>
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFile(false)} />
                  </div>
                )}
                <div className="flex gap-2 mt-3 items-end flex-wrap">
                  <Field label="Date"><input type="date" className="tc-input px-2 py-1.5 text-sm" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} /></Field>
                  <Field label="Sport">
                    <select className="tc-input px-2 py-1.5 text-sm" value={manual.sport} onChange={(e) => setManual({ ...manual, sport: e.target.value })}>
                      <option value="run">Run</option><option value="bike">Bike</option><option value="swim">Swim</option><option value="strength">Strength</option>
                    </select>
                  </Field>
                  <Field label="min"><input type="number" placeholder="60" className="tc-input px-2 py-1.5 text-sm tc-mono" style={{ width: 64 }} value={manual.min} onChange={(e) => setManual({ ...manual, min: e.target.value })} /></Field>
                  {manual.sport === "run" && (
                    <Field label="mi"><input type="number" placeholder="5" className="tc-input px-2 py-1.5 text-sm tc-mono" style={{ width: 60 }} value={manual.dist} onChange={(e) => setManual({ ...manual, dist: e.target.value })} /></Field>
                  )}
                  <button className="tc-btn tc-btn-ghost px-3 py-2" title="Log session" onClick={async () => {
                    const m = parseFloat(manual.min); if (!m || !manual.date) return;
                    const distMi = parseFloat(manual.dist) || null;
                    const row = { key: manual.date, sport: manual.sport, hours: m / 60, distMi: manual.sport === "run" ? distMi : null, avgHR: null };
                    if (synced) {
                      const { error } = await live.logManual(row);
                      setToast(error ? "Could not log session — check connection" : "Logged to your Strava account");
                      setTimeout(() => setToast(null), 3000);
                    } else {
                      addActivities([row], "Logged");
                    }
                    setManual({ ...manual, min: "", dist: "" });
                  }}><Plus size={16} /></button>
                </div>
                <div className="text-xs mt-2 leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                  CSV from Garmin/Strava — keep Distance and Avg HR columns to power VO2max and the 80/20 check.
                </div>
              </details>
              <div className="text-xs mt-3" style={{ color: "var(--ink-soft)" }}>
                {synced
                  ? "Live from Strava — new workouts appear automatically. Manual entries save to your account."
                  : activities.length + " session" + (activities.length === 1 ? "" : "s") + " loaded · this session only."}
              </div>
            </div>

          </div>
        </div>

        <div className="mt-4"><ConsistencyGrid activities={activities} /></div>

        {/* Load chart */}
        <details className="tc-details tc-card p-4 sm:p-5 mt-4" name="dash">
          <summary className="flex items-center justify-between" style={{ cursor: "pointer" }}>
            <span className="tc-eyebrow">Weekly hours — modality mix vs plan</span>
            <ChevronDown size={16} style={{ color: "var(--ink-soft)" }} />
          </summary>
          <div style={{ width: "100%", height: 230 }}>
            <ResponsiveContainer>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisTick }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: axisTick }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tipStyle} labelStyle={tipLabel} />
                <Legend wrapperStyle={{ fontSize: 12, color: axisTick }} />
                <Bar dataKey="Swim" stackId="hrs" fill="#3D6B8E" maxBarSize={26} />
                <Bar dataKey="Bike" stackId="hrs" fill="#E8541E" maxBarSize={26} />
                <Bar dataKey="Run" stackId="hrs" fill="#3E7C59" maxBarSize={26} />
                <Bar dataKey="Strength" stackId="hrs" fill="#C9821B" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Line dataKey="Planned" stroke="#182740" strokeWidth={2} dot={{ r: 2.5 }} strokeDasharray="5 4" connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </details>

        {/* Badges */}
        <details className="tc-details tc-card p-4 sm:p-5 mt-4" name="dash">
          <summary className="flex items-center justify-between">
            <span className="tc-eyebrow">Badges · {game.earnedCount} of {game.badges.length} earned</span>
            <ChevronDown size={16} style={{ color: "var(--ink-soft)" }} />
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {game.badges.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.id} className="flex flex-col items-center text-center p-3 rounded-xl" title={b.desc}
                  style={{ border: "1px solid var(--line)", opacity: b.earned ? 1 : 0.35, background: b.earned ? "var(--paper)" : "transparent" }}>
                  <Icon size={22} style={{ color: b.earned ? "var(--amber)" : "var(--ink-soft)" }} />
                  <div className="tc-display mt-1" style={{ fontSize: 15, fontWeight: 600 }}>{b.name}</div>
                  <div className="text-xs" style={{ color: "var(--ink-soft)" }}>{b.desc}</div>
                </div>
              );
            })}
          </div>
        </details>

        {/* The science */}
        <details className="tc-details tc-card p-4 sm:p-5 mt-4" name="dash">
          <summary className="flex items-center justify-between">
            <span className="tc-eyebrow flex items-center gap-1.5"><FlaskConical size={14} /> The science — what this app does, and why</span>
            <ChevronDown size={16} style={{ color: "var(--ink-soft)" }} />
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {SCIENCE.map(([title, what, cite]) => (
              <div key={title} className="p-3 rounded-xl" style={{ border: "1px solid var(--line)" }}>
                <div className="tc-display" style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
                <div className="text-sm mt-1" style={{ color: "var(--ink)" }}>{what}</div>
                <div className="text-xs mt-1.5 tc-mono" style={{ color: "var(--ink-soft)" }}>{cite}</div>
              </div>
            ))}
          </div>
        </details>

        {/* Full plan */}
        <details className="tc-details tc-card p-4 sm:p-5 mt-4" name="dash">
          <summary className="flex items-center justify-between">
            <span className="tc-eyebrow">Full plan · {plan.totalWeeks} weeks · peaks at {fmtHM(plan.peak)}/wk{plan.P.masters ? " · masters recovery cycle" : ""}</span>
            <ChevronDown size={16} style={{ color: "var(--ink-soft)" }} />
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="tc-eyebrow text-left" style={{ fontSize: 11 }}>
                  <th className="py-1.5 pr-3">Wk</th><th className="pr-3">Starts</th><th className="pr-3">Phase</th>
                  <th className="pr-3">Hours</th>{cfg.capBike && <th className="pr-3">Long ride</th>}<th className="pr-3">Long run</th>
                </tr>
              </thead>
              <tbody>
                {plan.weeks.map((w) => (
                  <tr key={w.i} style={{ borderTop: "1px solid var(--line)", background: currentWeek?.i === w.i ? "var(--steel-soft)" : "transparent" }}>
                    <td className="py-1.5 pr-3 tc-mono">{w.i + 1}</td>
                    <td className="pr-3">{fmtDate(w.start)}</td>
                    <td className="pr-3"><span className="tc-chip" style={{ background: "transparent", color: PHASE_COLOR[w.phase], padding: 0 }}>{w.phase}</span></td>
                    <td className="pr-3 tc-mono">{w.phase === "Race week" ? "Race" : fmtHM(w.target)}</td>
                    {cfg.capBike && <td className="pr-3 tc-mono">{w.longBike ? fmtHM(w.longBike) : "—"}</td>}
                    <td className="pr-3 tc-mono">{w.longRun ? fmtHM(w.longRun) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <p className="text-xs mt-4 mb-2" style={{ color: "var(--ink-soft)" }}>
          Methods: ACWR readiness (Gabbett 0.8–1.3), polarized 80/20 intensity (Seiler), evidence-based taper (Mujika), Tanaka HR zones, Jeukendrup fueling bands, VDOT performance model (Daniels–Gilbert) with Riegel projections. VO2max figures are estimates, not lab tests; weight is used only to size fueling; none of this is medical advice — pain beyond normal soreness means see a professional.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm"
          style={{ background: "rgba(22,35,56,.74)", color: "#fff", WebkitBackdropFilter: "blur(20px) saturate(180%)", backdropFilter: "blur(20px) saturate(180%)", border: "1px solid rgba(255,255,255,.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.25), 0 12px 30px rgba(22,35,56,.32)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
