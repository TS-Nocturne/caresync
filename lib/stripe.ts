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

export type BillingInterval = "month" | "semi_annual" | "year";

export function stripePriceIdForInterval(interval: BillingInterval) {
  if (interval === "month") return STRIPE_PRICE_IDS.PRO_MONTHLY;
  if (interval === "semi_annual") return STRIPE_PRICE_IDS.PRO_SEMI_ANNUAL;
  return STRIPE_PRICE_IDS.PRO_ANNUAL;
}

export function billingIntervalForStripePriceId(priceId: string | null | undefined): BillingInterval | null {
  if (!priceId) return null;
  if (priceId === STRIPE_PRICE_IDS.PRO_MONTHLY || priceId === "dev:PRO:month") return "month";
  if (priceId === STRIPE_PRICE_IDS.PRO_SEMI_ANNUAL || priceId === "dev:PRO:semi_annual") return "semi_annual";
  if (priceId === STRIPE_PRICE_IDS.PRO_ANNUAL || priceId === "dev:PRO:year") return "year";
  return null;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && STRIPE_PRICE_IDS.PRO_MONTHLY);
}
