-- CreateEnum
CREATE TYPE "PineconeSyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "pineconeSyncStatus" "PineconeSyncStatus" NOT NULL DEFAULT 'PENDING';
