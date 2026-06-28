interface MedicalDisclaimerProps {
  compact?: boolean;
  tone?: "neutral" | "onDark";
}

export default function MedicalDisclaimer({
  compact = false,
  tone = "neutral",
}: MedicalDisclaimerProps) {
  const classes =
    tone === "onDark"
      ? "border-white/20 bg-white/10 text-white/85"
      : "border-border bg-muted/50 text-muted-foreground";

  return (
    <div className={`rounded-xl border ${classes} ${compact ? "px-3 py-2 text-xs" : "p-4 text-sm"}`}>
      <p className="font-medium">ข้อมูลนี้ใช้เพื่อการบันทึก ติดตาม และประสานงานการดูแลเท่านั้น</p>
      <p className={compact ? "mt-1" : "mt-2"}>
        CareSync ไม่ได้วินิจฉัยโรค สั่งการรักษา ปรับยา หรือแทนการประเมินจากบุคลากรทางการแพทย์
        หากสงสัยภาวะฉุกเฉินให้ติดต่อบริการฉุกเฉินหรือผู้เชี่ยวชาญโดยตรง
      </p>
    </div>
  );
}
