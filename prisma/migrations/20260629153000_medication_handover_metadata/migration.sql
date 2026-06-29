ALTER TABLE "Medication" ADD COLUMN "selfAdministered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Medication" ADD COLUMN "skipReason" TEXT;
ALTER TABLE "Medication" ADD COLUMN "handledByName" TEXT;
ALTER TABLE "Medication" ADD COLUMN "handledByRole" TEXT;
