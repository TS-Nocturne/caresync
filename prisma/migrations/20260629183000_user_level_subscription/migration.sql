-- Move billing state from workspace/organization subscriptions to user accounts.
ALTER TABLE "User" ADD COLUMN "planType" "PlanTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "stripePriceId" TEXT;
ALTER TABLE "User" ADD COLUMN "stripeSubId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionStatus" "SubStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);

UPDATE "User" AS u
SET
  "planType" = COALESCE(s."plan", u."planType"),
  "stripeCustomerId" = COALESCE(u."stripeCustomerId", s."stripeCustomerId"),
  "stripePriceId" = COALESCE(u."stripePriceId", s."stripePriceId"),
  "stripeSubId" = COALESCE(u."stripeSubId", s."stripeSubId"),
  "subscriptionStatus" = COALESCE(s."status", u."subscriptionStatus"),
  "cancelAtPeriodEnd" = COALESCE(s."cancelAtPeriodEnd", u."cancelAtPeriodEnd"),
  "currentPeriodEnd" = COALESCE(u."currentPeriodEnd", s."currentPeriodEnd")
FROM "Member" AS m
JOIN "Subscription" AS s ON s."organizationId" = m."organizationId"
WHERE m."userId" = u."id" AND m."role" = 'owner';

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_stripeSubId_key" ON "User"("stripeSubId");

DROP TABLE "Subscription";
