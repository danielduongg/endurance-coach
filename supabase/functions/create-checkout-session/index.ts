// POST /functions/v1/create-checkout-session
// Starts a Stripe Checkout subscription for the signed-in user; returns { url }.
// Deployed with verify_jwt=false (to answer the CORS preflight) but requires a
// valid Supabase user in-code. No card data ever touches our servers.

import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sb } from "../_shared/strava.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: "2024-06-20",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST" }, 405);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: uErr } = await asUser.auth.getUser();
  if (uErr || !user) return json({ error: "unauthorized" }, 401);

  try {
    // Reuse or create the Stripe customer; remember it on the billing row.
    const { data: bill } = await sb.from("billing").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    let customerId = bill?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
      customerId = customer.id;
      await sb.from("billing").update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    }

    const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || "";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID")!, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}?checkout=success`,
      cancel_url: `${origin}?checkout=cancel`,
      allow_promotion_codes: true,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("checkout failed", e);
    return json({ error: "checkout failed" }, 500);
  }
});
