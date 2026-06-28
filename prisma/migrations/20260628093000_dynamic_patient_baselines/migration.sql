ALTER TABLE "Patient"
ADD COLUMN "baselineSystolicLower" DOUBLE PRECISION,
ADD COLUMN "baselineSystolicUpper" DOUBLE PRECISION,
ADD COLUMN "baselineDiastolicLower" DOUBLE PRECISION,
ADD COLUMN "baselineDiastolicUpper" DOUBLE PRECISION,
ADD COLUMN "baselineTemperatureLower" DOUBLE PRECISION,
ADD COLUMN "baselineTemperatureUpper" DOUBLE PRECISION,
ADD COLUMN "baselineHeartRateLower" DOUBLE PRECISION,
ADD COLUMN "baselineHeartRateUpper" DOUBLE PRECISION,
ADD COLUMN "baselineOxygenSatMin" DOUBLE PRECISION,
ADD COLUMN "baselineOxygenSatMax" DOUBLE PRECISION,
ADD COLUMN "baselineInsightText" TEXT,
ADD COLUMN "baselineCalculatedAt" TIMESTAMP(3);
