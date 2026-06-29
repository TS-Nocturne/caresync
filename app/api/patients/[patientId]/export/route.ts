import { existsSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/auth-server";
import { requirePatientAccess } from "@/lib/workspace-access";
import { calculateAge } from "@/lib/patient-registration";
import { apiError } from "@/lib/api-security";

export const runtime = "nodejs";

function findThaiFont() {
  const candidates = [
    process.env.THAI_PDF_FONT_PATH,
    path.join(process.cwd(), "public", "fonts", "Sarabun-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "NotoSansThai-Regular.ttf"),
    "C:\\Windows\\Fonts\\tahoma.ttf",
    "C:\\Windows\\Fonts\\angsana.ttc",
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function text(value: unknown) {
  if (value == null || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return String(value);
}

function addSection(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8);
  doc.fontSize(15).fillColor("#0f766e").text(title);
  doc.moveDown(0.3);
  doc.strokeColor("#d9e5e2").lineWidth(1).moveTo(doc.x, doc.y).lineTo(540, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fillColor("#111827").fontSize(11);
}

function addKeyValue(doc: PDFKit.PDFDocument, label: string, value: unknown) {
  doc.fontSize(10).fillColor("#4b5563").text(label, { continued: true });
  doc.fillColor("#111827").text(`  ${text(value)}`);
}

function addRows(
  doc: PDFKit.PDFDocument,
  rows: Array<Array<string | number | null | undefined>>,
  emptyText: string
) {
  if (rows.length === 0) {
    doc.fillColor("#6b7280").text(emptyText);
    return;
  }

  for (const row of rows) {
    const line = row.map(text).join(" | ");
    doc.fillColor("#111827").fontSize(9.5).text(line, { width: 500 });
    doc.moveDown(0.2);
  }
}

async function buildPdf(patientId: string, orgId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: orgId },
    include: {
      organization: { select: { name: true } },
      emergencyContacts: true,
      medications: { orderBy: { createdAt: "desc" } },
      vitalSigns: { orderBy: { measuredAt: "desc" }, take: 500 },
      alerts: { orderBy: { createdAt: "desc" }, take: 200 },
      symptoms: { orderBy: { loggedAt: "desc" }, take: 200 },
      painLogs: { orderBy: { loggedAt: "desc" }, take: 200 },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 300 },
      consents: { orderBy: { grantedAt: "desc" } },
      calendarEvents: { orderBy: { startTime: "desc" }, take: 200 },
    },
  });

  if (!patient) return null;

  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
  const fontPath = findThaiFont();
  if (fontPath) {
    doc.font(fontPath);
  }

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

  doc.fontSize(20).fillColor("#0f172a").text("รายงานข้อมูลผู้สูงอายุ", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#64748b").text(`Exported: ${formatDate(new Date())}`, { align: "center" });
  doc.moveDown(1);

  addSection(doc, "ข้อมูลส่วนตัว");
  addKeyValue(doc, "Workspace", patient.organization.name);
  addKeyValue(doc, "ชื่อ", `${patient.firstName} ${patient.lastName}`);
  addKeyValue(doc, "ชื่อเล่น", patient.nickname);
  addKeyValue(doc, "อายุ", `${calculateAge(patient.dateOfBirth)} ปี`);
  addKeyValue(doc, "วันเกิด", formatDate(patient.dateOfBirth));
  addKeyValue(doc, "เพศ", patient.gender);
  addKeyValue(doc, "ห้อง / ที่พัก", patient.roomNumber);
  addKeyValue(doc, "กรุ๊ปเลือด", patient.bloodType);
  addKeyValue(doc, "น้ำหนัก / ส่วนสูง", `${text(patient.weightKg)} kg / ${text(patient.heightCm)} cm`);
  addKeyValue(doc, "โรคประจำตัว", patient.underlyingDiseases);
  addKeyValue(doc, "แพ้", patient.allergies);
  addKeyValue(doc, "ข้อจำกัดทางร่างกาย", patient.mobilityStatus);
  addKeyValue(doc, "สถานพยาบาล", patient.preferredHospital);
  addKeyValue(doc, "เลข HN", patient.hospitalNumber);
  addKeyValue(doc, "สิทธิ์การรักษา", patient.insuranceType);

  addSection(doc, "เกณฑ์ค่าสถิติร่างกายพื้นฐาน");
  addKeyValue(doc, "ความดัน", `${text(patient.baselineSystolic)}/${text(patient.baselineDiastolic)}`);
  addKeyValue(doc, "อุณหภูมิ", patient.baselineTemperature);
  addKeyValue(doc, "ชีพจร", patient.baselineHeartRate);
  addKeyValue(doc, "SpO2", patient.baselineOxygenSat);
  addKeyValue(doc, "AI baseline note", patient.baselineInsightText);
  addKeyValue(doc, "คำนวณล่าสุด", formatDate(patient.baselineCalculatedAt));

  addSection(doc, "ผู้ติดต่อฉุกเฉิน");
  addRows(
    doc,
    patient.emergencyContacts.map((contact) => [
      contact.name,
      contact.phone,
      contact.relation,
      contact.isPrimary ? "primary" : "",
    ]),
    "ไม่มีข้อมูลผู้ติดต่อฉุกเฉิน"
  );

  addSection(doc, "รายการยา / กิจวัตร");
  addRows(
    doc,
    patient.medications.map((med) => [
      med.name,
      med.strength,
      med.dosage,
      med.scheduleTime,
      med.status,
      med.instruction,
    ]),
    "ไม่มีรายการยา"
  );

  addSection(doc, "ประวัติค่าสถิติร่างกาย");
  addRows(
    doc,
    patient.vitalSigns.map((vital) => [
      formatDate(vital.measuredAt),
      `BP ${text(vital.systolic)}/${text(vital.diastolic)}`,
      `Temp ${text(vital.temperature)}`,
      `HR ${text(vital.heartRate)}`,
      `SpO2 ${text(vital.oxygenSat)}`,
      vital.notes,
    ]),
    "ไม่มีประวัติค่าสถิติร่างกาย"
  );

  addSection(doc, "อาการ / ความปวด / แจ้งเตือน");
  addRows(
    doc,
    [
      ...patient.symptoms.map((symptom) => [
        "Symptom",
        formatDate(symptom.loggedAt),
        symptom.symptom,
        symptom.severity,
        symptom.notes,
      ]),
      ...patient.painLogs.map((pain) => [
        "Pain",
        formatDate(pain.loggedAt),
        pain.bodyPart,
        `level ${pain.painLevel}`,
      ]),
      ...patient.alerts.map((alert) => [
        "Alert",
        formatDate(alert.createdAt),
        alert.level,
        alert.title,
        alert.description,
      ]),
    ],
    "ไม่มีประวัติอาการ ความปวด หรือแจ้งเตือน"
  );

  addSection(doc, "กิจกรรมย้อนหลัง");
  addRows(
    doc,
    patient.activityLogs.map((log) => [formatDate(log.createdAt), log.type, log.title, log.description]),
    "ไม่มีกิจกรรมย้อนหลัง"
  );

  addSection(doc, "Consent และปฏิทิน");
  addRows(
    doc,
    [
      ...patient.consents.map((consent) => [
        "Consent",
        formatDate(consent.grantedAt),
        consent.consentType,
        consent.granted ? "granted" : "not granted",
        consent.revokedAt ? `revoked ${formatDate(consent.revokedAt)}` : "",
      ]),
      ...patient.calendarEvents.map((event) => [
        "Calendar",
        formatDate(event.startTime),
        event.type,
        event.status,
        event.title,
      ]),
    ],
    "ไม่มี consent หรือรายการปฏิทิน"
  );

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor("#94a3b8").text(`Page ${i + 1} of ${range.count}`, 42, 805, {
      align: "center",
      width: 511,
    });
  }

  const finished = new Promise<void>((resolve) => {
    doc.on("end", resolve);
  });
  doc.end();
  await finished;

  return {
    patient,
    buffer: Buffer.concat(chunks),
  };
}

export async function GET(request: Request, context: { params: Promise<{ patientId: string }> }) {
  try {
    const session = await requireSession();
    const { patientId } = await context.params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    await requireOrgMembership(orgId, session.user.id);
    await requirePatientAccess(orgId, session.user.id, patientId);

    const result = await buildPdf(patientId, orgId);
    if (!result) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const fileName = `patient-${result.patient.id}-history.pdf`;
    return new NextResponse(result.buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error, "Failed to export patient PDF");
  }
}
