CREATE TABLE "PatientRegistrationDraft" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientRegistrationDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientRegistrationDraft_organizationId_userId_key" ON "PatientRegistrationDraft"("organizationId", "userId");
CREATE INDEX "PatientRegistrationDraft_organizationId_updatedAt_idx" ON "PatientRegistrationDraft"("organizationId", "updatedAt");

ALTER TABLE "PatientRegistrationDraft" ADD CONSTRAINT "PatientRegistrationDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientRegistrationDraft" ADD CONSTRAINT "PatientRegistrationDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
