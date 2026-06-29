export type MobilityStatus = "INDEPENDENT" | "ASSISTED" | "WHEELCHAIR" | "BEDBOUND";
export type InsuranceType = "REIMBURSEMENT" | "SOCIAL_SECURITY" | "GOLD_CARD" | "SELF_PAY";
export type TimeOfDay = "MORNING" | "NOON" | "EVENING" | "BEDTIME";
export type MedicationFrequency = "DAILY" | "EVERY_OTHER_DAY" | "CUSTOM_DAYS";

export interface EmergencyContactInput {
  name: string;
  phone: string;
  relation?: string;
  isPrimary?: boolean;
}

export interface MedicationInput {
  name: string;
  strength: string;
  doseAmount: string;
  doseUnit: string;
  dosage: string;
  timeOfDay: TimeOfDay[];
  isPrn?: boolean;
  frequency: MedicationFrequency;
  frequencyDays: number[];
  indication?: string;
  appearance?: string;
  instruction?: string;
  selfAdministered?: boolean;
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

export const MEDICATION_DOSE_UNITS = ["เม็ด", "แคปซูล", "ช้อนชา", "มล.", "ซอง", "หยด", "พัฟ"] as const;

export const MEDICATION_FREQUENCY_LABELS: Record<MedicationFrequency, string> = {
  DAILY: "ทุกวัน",
  EVERY_OTHER_DAY: "วันเว้นวัน",
  CUSTOM_DAYS: "เลือกวันเอง",
};

export const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] as const;

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
  baselineSystolicLower?: number | null;
  baselineSystolicUpper?: number | null;
  baselineDiastolicLower?: number | null;
  baselineDiastolicUpper?: number | null;
  baselineTemperatureLower?: number | null;
  baselineTemperatureUpper?: number | null;
  baselineHeartRateLower?: number | null;
  baselineHeartRateUpper?: number | null;
  baselineOxygenSatMin?: number | null;
  baselineOxygenSatMax?: number | null;
  baselineInsightText?: string | null;
  baselineCalculatedAt?: Date | string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  preferredHospital?: string | null;
  hospitalNumber?: string | null;
  insuranceType?: string | null;
  emergencyContacts?: Array<{ name: string; phone: string; relation?: string | null }>;
  medications?: Array<{
    name: string;
    strength?: string | null;
    doseAmount?: number | null;
    doseUnit?: string | null;
    dosage: string;
    scheduleTime: string;
    timeOfDay?: string[];
    isPrn?: boolean;
    frequency?: string | null;
    frequencyDays?: number[];
    indication?: string | null;
    appearance?: string | null;
    instruction?: string | null;
    selfAdministered?: boolean;
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
    baseline_systolic_lower: patient.baselineSystolicLower,
    baseline_systolic_upper: patient.baselineSystolicUpper,
    baseline_diastolic_lower: patient.baselineDiastolicLower,
    baseline_diastolic_upper: patient.baselineDiastolicUpper,
    baseline_temperature_lower: patient.baselineTemperatureLower,
    baseline_temperature_upper: patient.baselineTemperatureUpper,
    baseline_heart_rate_lower: patient.baselineHeartRateLower,
    baseline_heart_rate_upper: patient.baselineHeartRateUpper,
    baseline_oxygen_sat_min: patient.baselineOxygenSatMin,
    baseline_oxygen_sat_max: patient.baselineOxygenSatMax,
    baseline_insight_text: patient.baselineInsightText,
    baseline_calculated_at: patient.baselineCalculatedAt,
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
      strength: m.strength,
      dose_amount: m.doseAmount,
      dose_unit: m.doseUnit,
      dosage: m.dosage,
      schedule_time: m.scheduleTime,
      time_of_day: m.timeOfDay ?? [],
      is_prn: m.isPrn ?? false,
      frequency: m.frequency,
      frequency_days: m.frequencyDays ?? [],
      indication: m.indication,
      appearance: m.appearance,
      instruction: m.instruction,
      self_administered: m.selfAdministered ?? false,
    })),
  };
}
