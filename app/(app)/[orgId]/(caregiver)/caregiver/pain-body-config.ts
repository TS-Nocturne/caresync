export const BODY_PARTS = [
  "head",
  "neck",
  "left-shoulder",
  "right-shoulder",
  "left-chest",
  "right-chest",
  "abdomen",
  "left-arm",
  "right-arm",
  "left-leg",
  "right-leg",
  "left-knee",
  "right-knee",
  "upper-back",
  "lower-back",
] as const;

export type BodyPart = typeof BODY_PARTS[number];

export interface PainPoint {
  muscle: BodyPart;
  level: number;
}

// Thai translations for UI labels
export const BODY_PART_LABELS: Record<BodyPart, string> = {
  head: "ศีรษะ (Head)",
  neck: "คอ (Neck)",
  "left-shoulder": "ไหล่ซ้าย (Left Shoulder)",
  "right-shoulder": "ไหล่ขวา (Right Shoulder)",
  "left-chest": "หน้าอกซ้าย (Left Chest)",
  "right-chest": "หน้าอกขวา (Right Chest)",
  abdomen: "หน้าท้อง (Abs)",
  "left-arm": "แขนซ้าย (Left Arm)",
  "right-arm": "แขนขวา (Right Arm)",
  "left-leg": "ขาซ้าย (Left Leg)",
  "right-leg": "ขาขวา (Right Leg)",
  "left-knee": "ข้อเข่าซ้าย (Left Knee)",
  "right-knee": "ข้อเข่าขวา (Right Knee)",
  "upper-back": "หลังส่วนบน (Upper Back)",
  "lower-back": "หลังส่วนล่าง (Lower Back)",
};

export const ANTERIOR_MUSCLES: BodyPart[] = [
  "head",
  "neck",
  "left-shoulder",
  "right-shoulder",
  "left-chest",
  "right-chest",
  "abdomen",
  "left-arm",
  "right-arm",
  "left-leg",
  "right-leg",
  "left-knee",
  "right-knee",
];

export const POSTERIOR_MUSCLES: BodyPart[] = [
  "head",
  "neck",
  "left-shoulder",
  "right-shoulder",
  "upper-back",
  "lower-back",
  "left-arm",
  "right-arm",
  "left-leg",
  "right-leg",
  "left-knee",
  "right-knee",
];
