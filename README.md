# Endurance Coach — deploy guide

A Vite + React app with **real Strava sync built in**. It's fully client-side except
for the Strava backend (bundled in `supabase/`). Without that backend configured, the
app still runs entirely in the browser — CSV import, manual logging, demo data, the
VO2max/VDOT engine, the plan generator, and the light/dark Liquid Glass UI. Configure
the backend (step 5) and "Connect with Strava" becomes a real OAuth login that
live-syncs every watch upload.

---

## 0. Prerequisites
- **Node.js 18 or newer** (check with `node -v`). Get it from https://nodejs.org if needed.
- A free **GitHub** account (recommended) and a free **Vercel** account (or Netlify / Cloudflare Pages).

---

## 1. Run it locally first
From inside this folder:

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). You should see the setup
screen. Click **Demo** to populate it. `Ctrl+C` stops the dev server.

Make a production build any time with:

```bash
npm run build      # outputs the static site into dist/
npm run preview    # serves dist/ locally to test the real build
```

That `dist/` folder is the entire deployable site — plain HTML/CSS/JS.

---

## 2. Put it on GitHub (recommended path)
```bash
git init
git add .
git commit -m "Endurance Coach app"
```
Create a new empty repo on github.com (no README), then:
```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

---

## 3. Deploy

### Option A — Vercel (easiest, free)
1. Go to https://vercel.com and sign in with GitHub.
2. **Add New… → Project**, pick your repo.
3. Vercel auto-detects Vite. Confirm:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Click **Deploy**. ~30 seconds later you get a live `https://<project>.vercel.app` URL.
5. Every `git push` to `main` now redeploys automatically.

Prefer the terminal? `npm i -g vercel`, then run `vercel` in this folder and answer the prompts.

### Option B — Netlify (no GitHub needed)
- Drag-and-drop: run `npm run build`, go to https://app.netlify.com/drop, and drop the **`dist`** folder. Instant URL.
- Or connect the GitHub repo and set **Build command** `npm run build`, **Publish directory** `dist`.

### Option C — Cloudflare Pages
- https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**.
- **Build command:** `npm run build` · **Build output directory:** `dist` · **Framework preset:** Vite.

### Option D — GitHub Pages (free, slightly more setup)
GitHub Pages serves from a subpath, so first edit `vite.config.js`:
```js
base: "/<your-repo>/",
```
Then build and publish the `dist` folder (simplest with the `gh-pages` package, or a GitHub Action). Your site lands at `https://<username>.github.io/<your-repo>/`.

---

## 4. Custom domain (optional)
On Vercel/Netlify/Cloudflare: open the project → **Domains/Settings → add your domain**,
then point your registrar's DNS at the records they show you (an `A`/`ALIAS` for the
apex and a `CNAME` for `www`). HTTPS is automatic.

---

## 5. Turn on real Strava sync (optional but built-in)
The frontend is **already wired** to Strava — you just deploy the backend (bundled in
`supabase/`) and set two env vars. No code edits. Until then the app runs in offline
mode and the connect button reads "configure backend."

What you get: connect once, and every watch upload appears in the app within seconds
(watch → Strava → webhook → database → live UI), with 180 days backfilled on connect.

**5a. Create the Strava API app.** strava.com → Settings → My API Application
(strava.com/settings/api). Set **Authorization Callback Domain** to your Supabase ref
domain `‹project-ref›.supabase.co` (domain only). Note the **Client ID** and **Client Secret**.

**5b. Create a Supabase project** at supabase.com (free tier), and install the CLI:
```bash
npm i -g supabase
supabase login
```

**5c. Push the database + deploy the functions** (run from this project folder):
```bash
supabase link --project-ref ‹project-ref›
supabase db push        # creates the activities + token tables (supabase/migrations)

supabase secrets set \
  STRAVA_CLIENT_ID=‹id› \
  STRAVA_CLIENT_SECRET=‹secret› \
  STRAVA_VERIFY_TOKEN=$(openssl rand -hex 16) \
  APP_URL=https://‹your-deployed-app›

supabase functions deploy strava-auth strava-callback strava-webhook --no-verify-jwt
supabase functions deploy strava-backfill
```

**5d. Register the webhook** (once):
```bash
export STRAVA_CLIENT_ID=‹id› STRAVA_CLIENT_SECRET=‹secret› STRAVA_VERIFY_TOKEN=‹same as above› \
       SUPABASE_URL=https://‹project-ref›.supabase.co
./scripts/register-webhook.sh create
./scripts/register-webhook.sh view     # confirm it's registered
```

**5e. Point the frontend at it.** In your hosting dashboard (Vercel/Netlify/Cloudflare),
add two **environment variables**, then redeploy:
```
VITE_SUPABASE_URL=https://‹project-ref›.supabase.co
VITE_SUPABASE_ANON_KEY=‹anon public key from Supabase → Project Settings → API›
```
(Locally, copy `.env.example` to `.env` and fill the same two values.) Both are public —
the anon key is safe in a browser; the service-role key stays only in Supabase secrets.

**5f. Test.** Open the app → **Connect with Strava** → approve → you're redirected back
with a green "Strava · live" pill and your history loaded. Record any short workout (or
make one on strava.com) and it appears within seconds, no refresh.

Strava terms to respect (the app already complies): data is shown only to the athlete
themselves, and Strava-sourced data isn't fed into AI/ML — the coaching engine is
heuristic. Use the official "Connect with Strava" button asset and a "Powered by Strava"
mark for a public launch (strava.com/brand). Full backend notes are in
`supabase/` and the original scaffold README.

Apple Watch users: set the Watch to auto-sync to Strava (via the Strava app or a
connector like HealthFit), and it flows through the same pipe.

---

## Project layout
```
index.html                 app shell + mount node
vite.config.js             Vite + React plugin (set `base` for subpath hosting)
tailwind.config.js         scans src for utility classes
postcss.config.js          Tailwind + autoprefixer
.env.example               copy to .env for Strava keys (step 5)
src/main.jsx               mounts <EnduranceCoach />
src/index.css              Tailwind directives
src/EnduranceCoach.jsx     the app (real Strava wired in)
src/supabaseClient.js      Supabase client (null until env vars set)
src/useLiveActivities.js   realtime Strava hook (history + live + manual logging)
supabase/                  the backend: edge functions + DB migration + config
  functions/strava-auth        OAuth redirect
  functions/strava-callback    token exchange + 180-day backfill
  functions/strava-webhook     receives live workout events
  functions/strava-backfill    manual re-pull (JWT-protected)
  functions/_shared/strava.ts  token refresh, classify, normalize
  migrations/…_init.sql        activities + token-vault tables + RLS
scripts/register-webhook.sh  create / view / delete the Strava webhook
```

## Notes
- The bundle is ~220 KB gzipped, mostly the charting + Supabase libraries — fine for a static site.
- Without the backend, data lives in the browser session (CSV import / manual logging / demo).
  With it, your Strava history persists server-side and syncs live; manual entries save to your account.
- The included `supabase/` backend deploys independently of the frontend host — the
  frontend only needs the two `VITE_SUPABASE_*` env vars to talk to it.
- To update the app later: edit `src/EnduranceCoach.jsx`, commit, push — your host redeploys.
