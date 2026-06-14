import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If you deploy to a subpath (e.g. GitHub Pages at /repo-name/), set `base`.
// For Vercel, Netlify, Cloudflare Pages (served at the domain root) leave it "/".
export default defineConfig({
  plugins: [react()],
  base: "/",
});
