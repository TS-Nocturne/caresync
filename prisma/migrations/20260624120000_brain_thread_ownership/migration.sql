-- CreateTable
CREATE TABLE "BrainThread" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "alertId" TEXT,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainThread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrainThread_threadId_key" ON "BrainThread"("threadId");

-- CreateIndex
CREATE INDEX "BrainThread_organizationId_patientId_idx" ON "BrainThread"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "BrainThread_alertId_idx" ON "BrainThread"("alertId");
