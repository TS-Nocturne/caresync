import type { Muscle } from "react-body-highlighter";

export type PainRegion =
  | Muscle
  | "left-chest"
  | "right-chest"
  | "left-front-deltoids"
  | "right-front-deltoids"
  | "left-back-deltoids"
  | "right-back-deltoids";

export interface PainPoint {
  region: PainRegion;
  muscle: Muscle;
  label: string;
  level: number;
}

export interface PainSeverity {
  label: string;
  tone: string;
  ring: string;
}

export const MUSCLE_LABELS: Record<Muscle, string> = {
  head: "ศีรษะ",
  neck: "คอ",
  trapezius: "บ่าและไหล่บน",
  "upper-back": "หลังส่วนบน",
  "lower-back": "หลังส่วนล่าง",
  chest: "หน้าอก",
  biceps: "ต้นแขนด้านหน้า",
  triceps: "ต้นแขนด้านหลัง",
  forearm: "ปลายแขน",
  "front-deltoids": "หัวไหล่ด้านหน้า",
  "back-deltoids": "หัวไหล่ด้านหลัง",
  abs: "หน้าท้อง",
  obliques: "เอวและสีข้าง",
  adductor: "ต้นขาด้านใน",
  abductors: "ต้นขาด้านนอก",
  hamstring: "ต้นขาด้านหลัง",
  quadriceps: "ต้นขาด้านหน้า",
  calves: "น่อง",
  gluteal: "สะโพกและก้น",
  knees: "เข่า",
  "left-soleus": "เท้าซ้าย",
  "right-soleus": "เท้าขวา",
};

export const REGION_LABELS: Record<PainRegion, string> = {
  ...MUSCLE_LABELS,
  "left-chest": "หน้าอกซ้าย",
  "right-chest": "หน้าอกขวา",
  "left-front-deltoids": "ไหล่หน้าซ้าย",
  "right-front-deltoids": "ไหล่หน้าขวา",
  "left-back-deltoids": "ไหล่หลังซ้าย",
  "right-back-deltoids": "ไหล่หลังขวา",
};

export const REGION_TO_MUSCLE: Record<PainRegion, Muscle> = {
  head: "head",
  neck: "neck",
  trapezius: "trapezius",
  "upper-back": "upper-back",
  "lower-back": "lower-back",
  chest: "chest",
  biceps: "biceps",
  triceps: "triceps",
  forearm: "forearm",
  "front-deltoids": "front-deltoids",
  "back-deltoids": "back-deltoids",
  abs: "abs",
  obliques: "obliques",
  adductor: "adductor",
  abductors: "abductors",
  hamstring: "hamstring",
  quadriceps: "quadriceps",
  calves: "calves",
  gluteal: "gluteal",
  knees: "knees",
  "left-soleus": "left-soleus",
  "right-soleus": "right-soleus",
  "left-chest": "chest",
  "right-chest": "chest",
  "left-front-deltoids": "front-deltoids",
  "right-front-deltoids": "front-deltoids",
  "left-back-deltoids": "back-deltoids",
  "right-back-deltoids": "back-deltoids",
};

export const ANTERIOR_MUSCLES: PainRegion[] = [
  "head",
  "neck",
  "left-chest",
  "right-chest",
  "abs",
  "obliques",
  "left-front-deltoids",
  "right-front-deltoids",
  "biceps",
  "triceps",
  "forearm",
  "quadriceps",
  "knees",
  "calves",
  "adductor",
  "abductors",
];

export const POSTERIOR_MUSCLES: PainRegion[] = [
  "trapezius",
  "upper-back",
  "lower-back",
  "left-back-deltoids",
  "right-back-deltoids",
  "triceps",
  "forearm",
  "gluteal",
  "hamstring",
  "calves",
  "left-soleus",
  "right-soleus",
  "knees",
];

export function getPainColor(level: number): string {
  if (level <= 2) return "#16a34a";
  if (level <= 4) return "#ca8a04";
  if (level <= 6) return "#ea580c";
  if (level <= 8) return "#dc2626";
  return "#7f1d1d";
}

export function getPainSeverity(level: number): PainSeverity {
  if (level <= 2) return { label: "ปวดเล็กน้อย", tone: "text-emerald-700 bg-emerald-50 border-emerald-200", ring: "ring-emerald-200" };
  if (level <= 4) return { label: "เฝ้าระวัง", tone: "text-yellow-700 bg-yellow-50 border-yellow-200", ring: "ring-yellow-200" };
  if (level <= 6) return { label: "ปวดปานกลาง", tone: "text-orange-700 bg-orange-50 border-orange-200", ring: "ring-orange-200" };
  if (level <= 8) return { label: "ปวดมาก", tone: "text-red-700 bg-red-50 border-red-200", ring: "ring-red-200" };
  return { label: "ปวดรุนแรง", tone: "text-rose-900 bg-rose-50 border-rose-200", ring: "ring-rose-200" };
}

export const PAIN_HIGHLIGHT_COLORS = Array.from({ length: 10 }, (_, i) => getPainColor(i + 1));
