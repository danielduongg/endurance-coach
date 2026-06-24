// POST /functions/v1/stripe-webhook — Stripe events update billing.subscription_status.
// Deployed with verify_jwt=false (Stripe doesn't send a Supabase JWT); instead we
// verify Stripe's signature against STRIPE_WEBHOOK_SECRET. Writes via service role.

import Stripe from "npm:stripe@16";
import { sb } from "../_shared/strava.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: "2024-06-20",
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

// deno-lint-ignore no-explicit-any
async function setStatus(customerId: string, status: string | null, periodEnd: number | null, userId?: string | null) {
  const patch: Record<string, unknown> = { subscription_status: status, updated_at: new Date().toISOString() };
  if (periodEnd) patch.current_period_end = new Date(periodEnd * 1000).toISOString();
  if (userId) {
    patch.stripe_customer_id = customerId;
    await sb.from("billing").update(patch).eq("user_id", userId);
  } else {
    await sb.from("billing").update(patch).eq("stripe_customer_id", customerId);
  }
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, sig!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!, undefined, cryptoProvider,
    );
  } catch (e) {
    console.error("bad stripe signature", e);
    return new Response("bad signature", { status: 400 });
  }

  try {
    // deno-lint-ignore no-explicit-any
    const o = event.data.object as any;
    switch (event.type) {
      case "checkout.session.completed":
        await setStatus(o.customer, "active", null, o.metadata?.user_id ?? o.client_reference_id);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await setStatus(o.customer, o.status, o.current_period_end, o.metadata?.user_id);
        break;
      case "customer.subscription.deleted":
        await setStatus(o.customer, "canceled", o.current_period_end, o.metadata?.user_id);
        break;
      case "invoice.paid":
        await setStatus(o.customer, "active", o.lines?.data?.[0]?.period?.end ?? null);
        break;
      case "invoice.payment_failed":
        await setStatus(o.customer, "past_due", null);
        break;
    }
  } catch (e) {
    console.error("webhook handler failed", e);
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
