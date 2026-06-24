-- CreateEnum
CREATE TYPE "MobilityStatus" AS ENUM ('INDEPENDENT', 'ASSISTED', 'WHEELCHAIR', 'BEDBOUND');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('REIMBURSEMENT', 'SOCIAL_SECURITY', 'SELF_PAY');

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "instruction" TEXT,
ADD COLUMN     "timeOfDay" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "baselineDiastolic" DOUBLE PRECISION,
ADD COLUMN     "baselineHeartRate" DOUBLE PRECISION,
ADD COLUMN     "baselineOxygenSat" DOUBLE PRECISION,
ADD COLUMN     "baselineSystolic" DOUBLE PRECISION,
ADD COLUMN     "baselineTemperature" DOUBLE PRECISION,
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "hospitalNumber" TEXT,
ADD COLUMN     "insuranceType" "InsuranceType",
ADD COLUMN     "mobilityStatus" "MobilityStatus" NOT NULL DEFAULT 'INDEPENDENT',
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "preferredHospital" TEXT,
ADD COLUMN     "underlyingDiseases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "weightKg" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyContact_patientId_idx" ON "EmergencyContact"("patientId");

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
