import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - CareSync",
  description: "ข้อกำหนดและเงื่อนไขการใช้งานสำหรับ CareSync",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-8">ข้อกำหนดและเงื่อนไขการใช้งาน (Terms of Service)</h1>
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>สัญญานี้เป็นข้อตกลงระหว่าง &quot;คุณ&quot; กับ &quot;ผู้ชำระเงิน (ตัวแทนครอบครัว)&quot;</p>

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">ข้อจำกัดความรับผิดชอบทางการแพทย์</h2>
          <p className="text-lg text-foreground font-bold bg-rose-50 dark:bg-rose-950/30 p-4 rounded-lg border border-rose-200 dark:border-rose-900">
            ระบบนี้ไม่ใช่เครื่องมือวินิจฉัยหรือสั่งการรักษาทางการแพทย์ (Not a Medical Device)
          </p>
          <p>การประมวลผลข้อมูลสุขภาพของระบบเป็นเพียง <strong className="text-foreground">การแสดงข้อมูลประกอบการติดตามอาการเบื้องต้น</strong> ไม่ใช่คำวินิจฉัย คำสั่งรักษา หรือคำสั่งปรับเปลี่ยนยา การตัดสินใจทางการแพทย์ต้องกระทำโดยบุคลากรทางการแพทย์เท่านั้น</p>

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">นโยบายการชำระเงินและการคืนเงิน (Refund Policy)</h2>
          <p>เราใช้ระบบ Stripe สำหรับการเก็บเงินแบบสมัครสมาชิก (Subscription) โดยระบบจะทำการตัดรอบบิลตามรอบที่กำหนด หากคุณกดยกเลิกกลางคัน <strong className="text-foreground">จะไม่มีการคืนเงิน (No Refund)</strong> แต่คุณจะสามารถใช้งานระบบต่อไปได้จนกว่าจะสิ้นสุดรอบบิลของเดือนนั้นๆ</p>

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">ความรับผิดชอบของ Account Owner</h2>
          <p>ผู้สร้างห้อง (Workspace) ไม่ว่าจะเป็นลูกคนโตหรือสมาชิกครอบครัว ต้องรับผิดชอบในการคัดกรองผู้ดูแลหรือบุคคลที่คุณส่งลิงก์เชิญ (Invite Link) เข้ามาในระบบด้วยตนเอง ทางแพลตฟอร์มไม่มีส่วนรับผิดชอบในการคัดกรองบุคคลดังกล่าว</p>
        </div>
      </div>
    </div>
  );
}
