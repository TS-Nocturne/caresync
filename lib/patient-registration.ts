export type MobilityStatus = "INDEPENDENT" | "ASSISTED" | "WHEELCHAIR" | "BEDBOUND";
export type InsuranceType = "REIMBURSEMENT" | "SOCIAL_SECURITY" | "SELF_PAY";
export type TimeOfDay = "MORNING" | "NOON" | "EVENING" | "BEDTIME";

export interface EmergencyContactInput {
  name: string;
  phone: string;
  relation?: string;
  isPrimary?: boolean;
}

export interface MedicationInput {
  name: string;
  dosage: string;
  timeOfDay: TimeOfDay[];
  instruction?: string;
}

export interface PatientRegistrationInput {
  orgId: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  dateOfBirth: string;
  gender: string;
  bloodType?: string;
  weightKg?: number;
  heightCm?: number;
  roomNumber?: string;
  underlyingDiseases: string[];
  allergies: string[];
  mobilityStatus: MobilityStatus;
  baselineSystolic?: number;
  baselineDiastolic?: number;
  baselineTemperature?: number;
  baselineHeartRate?: number;
  baselineOxygenSat?: number;
  preferredHospital?: string;
  hospitalNumber?: string;
  insuranceType?: InsuranceType;
  emergencyContacts: EmergencyContactInput[];
  medications: MedicationInput[];
  consentRelation: string;
  consentMandatory: boolean;
  consentOptional: boolean;
}

export const TIME_OF_DAY_SCHEDULE: Record<TimeOfDay, string> = {
  MORNING: "08:00",
  NOON: "12:00",
  EVENING: "18:00",
  BEDTIME: "21:00",
};

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  MORNING: "เช้า",
  NOON: "กลางวัน",
  EVENING: "เย็น",
  BEDTIME: "ก่อนนอน",
};

export const COMMON_DISEASES = [
  "เบาหวาน",
  "ความดันโลหิตสูง",
  "อัลไซเมอร์",
  "โรคหัวใจ",
  "โรคไต",
  "โรคปอด",
  "ข้อเข่าเสื่อม",
  "โรคหลอดเลือดสมอง",
];

export const COMMON_ALLERGIES = [
  "Penicillin",
  "Aspirin",
  "Sulfonamide",
  "Seafood",
  "Peanuts",
  "Eggs",
  "Latex",
];

export function calculateAge(dateOfBirth: string | Date): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function calculateBmi(weightKg?: number, heightCm?: number): number | null {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function buildPineconeProfile(patient: {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  underlyingDiseases?: string[];
  allergies?: string[];
  mobilityStatus?: string;
  baselineSystolic?: number | null;
  baselineDiastolic?: number | null;
  baselineTemperature?: number | null;
  baselineHeartRate?: number | null;
  baselineOxygenSat?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  preferredHospital?: string | null;
  hospitalNumber?: string | null;
  insuranceType?: string | null;
  emergencyContacts?: Array<{ name: string; phone: string; relation?: string | null }>;
  medications?: Array<{
    name: string;
    dosage: string;
    scheduleTime: string;
    timeOfDay?: string[];
    instruction?: string | null;
  }>;
}) {
  return {
    patient_id: patient.id,
    first_name: patient.firstName,
    last_name: patient.lastName,
    nickname: patient.nickname,
    underlying_diseases: patient.underlyingDiseases ?? [],
    allergies: patient.allergies ?? [],
    mobility_status: patient.mobilityStatus,
    baseline_systolic: patient.baselineSystolic,
    baseline_diastolic: patient.baselineDiastolic,
    baseline_temperature: patient.baselineTemperature,
    baseline_heart_rate: patient.baselineHeartRate,
    baseline_oxygen_sat: patient.baselineOxygenSat,
    weight_kg: patient.weightKg,
    height_cm: patient.heightCm,
    preferred_hospital: patient.preferredHospital,
    hospital_number: patient.hospitalNumber,
    insurance_type: patient.insuranceType,
    emergency_contacts: (patient.emergencyContacts ?? []).map((c) => ({
      name: c.name,
      phone: c.phone,
      relation: c.relation,
    })),
    medications: (patient.medications ?? []).map((m) => ({
      name: m.name,
      dosage: m.dosage,
      schedule_time: m.scheduleTime,
      time_of_day: m.timeOfDay ?? [],
      instruction: m.instruction,
    })),
  };
}
