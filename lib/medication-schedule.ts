export type MedicationRoundId = "MORNING" | "NOON" | "EVENING" | "BEDTIME";
export type MedicationFrequency = "DAILY" | "EVERY_OTHER_DAY" | "CUSTOM_DAYS";

export type MedicationWindow = {
  id: MedicationRoundId;
  label: string;
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
};

const WINDOWS: Array<Omit<MedicationWindow, "startMinutes" | "endMinutes">> = [
  { id: "MORNING", label: "รอบเช้า", start: "04:00", end: "10:00" },
  { id: "NOON", label: "รอบกลางวัน", start: "10:00", end: "16:00" },
  { id: "EVENING", label: "รอบเย็น", start: "16:00", end: "20:00" },
  { id: "BEDTIME", label: "รอบก่อนนอน", start: "20:00", end: "04:00" },
];

function toMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function containsMinute(window: Pick<MedicationWindow, "startMinutes" | "endMinutes">, minute: number) {
  if (window.startMinutes < window.endMinutes) {
    return minute >= window.startMinutes && minute < window.endMinutes;
  }
  return minute >= window.startMinutes || minute < window.endMinutes;
}

export function parseTimeToMinutes(value: string): number | null {
  return toMinutes(value);
}

export function getMedicationWindows(): MedicationWindow[] {
  return WINDOWS.map((window) => ({
    ...window,
    startMinutes: toMinutes(window.start) ?? 0,
    endMinutes: toMinutes(window.end) ?? 0,
  }));
}

export function getMedicationWindowForTime(time: string | Date = new Date()): MedicationWindow {
  const minute =
    typeof time === "string"
      ? toMinutes(time)
      : time.getHours() * 60 + time.getMinutes();

  const currentMinute = minute ?? new Date().getHours() * 60 + new Date().getMinutes();
  return (
    getMedicationWindows().find((window) => containsMinute(window, currentMinute)) ??
    getMedicationWindows()[0]
  );
}

export function isMedicationInWindow(scheduleTime: string, window: MedicationWindow): boolean {
  const minute = toMinutes(scheduleTime);
  if (minute == null) return false;
  return containsMinute(window, minute);
}

function parseLocalDate(value?: string | Date | null): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isMedicationDueOnDate(
  medication: {
    isPrn?: boolean | null;
    frequency?: string | null;
    frequencyDays?: number[] | null;
    createdAt?: Date | string | null;
  },
  date: string | Date = new Date()
): boolean {
  if (medication.isPrn) return false;

  const target = startOfDay(parseLocalDate(date));
  const frequency = (medication.frequency ?? "DAILY") as MedicationFrequency;

  if (frequency === "CUSTOM_DAYS") {
    return (medication.frequencyDays ?? []).includes(target.getDay());
  }

  if (frequency === "EVERY_OTHER_DAY") {
    const anchor = startOfDay(parseLocalDate(medication.createdAt));
    const diffDays = Math.floor((target.getTime() - anchor.getTime()) / 86_400_000);
    return diffDays >= 0 && diffDays % 2 === 0;
  }

  return true;
}
