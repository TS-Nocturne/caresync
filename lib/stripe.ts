import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

export const STRIPE_PRICE_IDS: Record<string, string> = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  PRO_SEMI_ANNUAL: process.env.STRIPE_PRICE_PRO_SEMI_ANNUAL ?? "",
  PRO_ANNUAL: process.env.STRIPE_PRICE_PRO_ANNUAL ?? "",
};

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && STRIPE_PRICE_IDS.PRO_MONTHLY);
}
