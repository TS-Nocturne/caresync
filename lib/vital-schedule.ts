/** Default vital measurement rounds — used by proactive reminder cron. */

export interface VitalRound {
  label: string;
  hour: number;
  minute: number;
}

export const DEFAULT_VITAL_ROUNDS: VitalRound[] = [
  { label: "รอบเช้า", hour: 8, minute: 0 },
  { label: "รอบบ่าย", hour: 14, minute: 0 },
  { label: "รอบเย็น", hour: 20, minute: 0 },
];

export function isWithinReminderWindow(
  now: Date,
  round: VitalRound,
  windowMinutes = 15
): boolean {
  const target = round.hour * 60 + round.minute;
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= target && current < target + windowMinutes;
}

export function reminderMessage(patientName: string, roundLabel: string): string {
  return `ถึงรอบบันทึกสัญญาณชีพ${roundLabel}ของ ${patientName} แล้ว — กรุณาวัดและบันทึกข้อมูล`;
}
