-- Enforce the product rule: one workspace/room can care for exactly one patient.
CREATE UNIQUE INDEX "Patient_organizationId_key" ON "Patient"("organizationId");
