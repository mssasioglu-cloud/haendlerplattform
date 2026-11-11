"use server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/format";

// Startet den Stripe-Checkout für die Händler-Flatrate.
export async function startCheckout() {
  const s = await getSession();
  if (!s?.dealer) redirect("/login");
  if (s.dealer.status !== "freigegeben") redirect("/status");
  if (!stripeConfigured()) redirect("/abo?fehler=stripe");

  const stripe = getStripe();
  let customerId = s.priv?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: s.email, name: s.dealer.company_name, metadata: { dealer_id: s.userId },
    });
    customerId = customer.id;
    await createAdminClient().from("dealer_private").update({ stripe_customer_id: customerId }).eq("dealer_id", s.userId);
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: s.userId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: { metadata: { dealer_id: s.userId } },
    locale: "de",
    success_url: absoluteUrl("/abo?erfolg=1"),
    cancel_url: absoluteUrl("/abo"),
  });
  redirect(session.url!);
}

// Öffnet das Stripe-Kundenportal (Zahlungsart ändern, Rechnungen, kündigen).
export async function openPortal() {
  const s = await getSession();
  if (!s?.priv?.stripe_customer_id || !stripeConfigured()) redirect("/konto");
  const portal = await getStripe().billingPortal.sessions.create({
    customer: s.priv.stripe_customer_id, return_url: absoluteUrl("/konto"),
  });
  redirect(portal.url);
}
