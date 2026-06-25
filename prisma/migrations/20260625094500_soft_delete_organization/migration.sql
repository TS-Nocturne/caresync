-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "deletedById" TEXT;
