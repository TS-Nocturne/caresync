"use client";

const symptoms = [
  { id: "คลื่นไส้", label: "คลื่นไส้", icon: "🤢" },
  { id: "เวียนหัว", label: "เวียนหัว", icon: "😵" },
  { id: "หายใจลำบาก", label: "หายใจลำบาก", icon: "😮‍💨" },
  { id: "มีไข้", label: "มีไข้", icon: "🌡️" },
  { id: "ปวดท้อง", label: "ปวดท้อง", icon: "🤕" },
  { id: "อ่อนเพลีย", label: "อ่อนเพลีย", icon: "😴" },
  { id: "ผื่นคัน", label: "ผื่นคัน", icon: "🔴" },
  { id: "บวม", label: "บวม", icon: "💧" },
  { id: "สับสน", label: "สับสน", icon: "😕" },
  { id: "เจ็บหน้าอก", label: "เจ็บหน้าอก", icon: "💔" },
  { id: "อาเจียน", label: "อาเจียน", icon: "🤮" },
  { id: "ท้องเสีย", label: "ท้องเสีย", icon: "🚽" },
];

export default function AbnormalSymptoms({
  selected,
  notes,
  reviewed,
  aiEnabled,
  onSelectedChange,
  onNotesChange,
  onReviewedChange,
  onEnableAi,
}: {
  selected: string[];
  notes: string;
  reviewed: boolean;
  aiEnabled?: boolean;
  onSelectedChange: (selected: string[]) => void;
  onNotesChange: (notes: string) => void;
  onReviewedChange: (reviewed: boolean) => void;
  onEnableAi?: () => void;
}) {
  const toggle = (id: string) => {
    onSelectedChange(
      selected.includes(id) ? selected.filter((symptom) => symptom !== id) : [...selected, id]
    );
  };

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
          !
        </span>
        <h2 className="text-lg font-semibold">อาการผิดปกติ</h2>
        {selected.length > 0 && (
          <span className="ml-auto text-xs font-medium bg-status-warning-bg text-status-warning px-2 py-0.5 rounded-full">
            เลือกแล้ว {selected.length} รายการ
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-5">
        {symptoms.map((symptom) => {
          const isActive = selected.includes(symptom.id);
          return (
            <button
              key={symptom.id}
              type="button"
              onClick={() => toggle(symptom.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                isActive
                  ? "border-status-warning bg-status-warning-bg shadow-md scale-[1.02]"
                  : "border-transparent bg-muted/50 hover:bg-muted hover:border-border"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-transform ${
                  isActive ? "scale-110" : ""
                }`}
              >
                {symptom.icon}
              </span>
              <span
                className={`text-[11px] font-medium leading-tight text-center ${
                  isActive ? "text-status-warning" : "text-muted-foreground"
                }`}
              >
                {symptom.label}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          หมายเหตุเพิ่มเติม
        </label>
        <div className="relative">
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="บันทึกรายละเอียดอาการสำหรับการประมวลผลข้อมูลเฝ้าระวัง..."
            rows={3}
            disabled={aiEnabled === false}
            className={`w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none ${
              aiEnabled === false ? "blur-sm opacity-50" : ""
            }`}
          />
          {aiEnabled === false && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center rounded-xl bg-background/40 backdrop-blur-[2px]">
              <p className="text-sm font-semibold text-foreground mb-1">
                🔒 ปลดล็อกขุมพลัง AI เพื่อดูแลคุณแม่
              </p>
              <p className="text-xs text-muted-foreground mb-3 max-w-[250px]">
                เปิดให้ AI ช่วยวิเคราะห์อาการและแจ้งเตือนคุณแบบเรียลไทม์ (รวมอยู่ในแพ็กเกจของคุณแล้ว)
              </p>
              <button
                type="button"
                onClick={onEnableAi}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
              >
                เปิดใช้งาน AI ทันที
              </button>
            </div>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 mt-4 p-3 rounded-xl border-2 border-dashed border-primary/30 cursor-pointer hover:bg-muted/30 transition-colors">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => onReviewedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        <span className="text-sm">
          <span className="font-medium text-foreground">ยืนยันการตรวจอาการเบื้องต้นแล้ว</span>
          <span className="block text-muted-foreground text-xs mt-0.5">
            บังคับกรอก — ติ๊กเมื่อตรวจอาการครบแล้ว (ไม่มีอาการผิดปกติ หรือเลือกอาการที่พบแล้ว)
          </span>
        </span>
      </label>
    </div>
  );
}
