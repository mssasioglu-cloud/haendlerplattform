import "server-only";
import Stripe from "stripe";

export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_ID;
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY fehlt");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
