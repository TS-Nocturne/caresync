import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - CareSync",
  description: "นโยบายความเป็นส่วนตัวสำหรับ CareSync",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-8">นโยบายความเป็นส่วนตัว (Privacy Policy)</h1>
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>ที่ CareSync เราให้ความสำคัญกับการปกป้องข้อมูลสุขภาพของคุณ นี่คือรายละเอียดว่าเรานำข้อมูลของคุณไปทำอะไรบ้าง</p>
          
          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">การเก็บรวบรวมข้อมูล</h2>
          <p>เราระบุอย่างชัดเจนว่าแอปพลิเคชันมีการเก็บข้อมูลดังต่อไปนี้:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>ชื่อและนามสกุล</li>
            <li>อายุ</li>
            <li>ประวัติการแพทย์</li>
            <li>สัญญาณชีพ (Vital Signs)</li>
            <li>พิกัด GPS (หากมีการ Check-in)</li>
            <li>ลายนิ้วมือหรือลายเซ็นดิจิทัล</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">วัตถุประสงค์การใช้ข้อมูล</h2>
          <p>เราใช้ข้อมูลที่รวบรวมเพื่อ <strong className="text-foreground">ประมวลผลความเสี่ยงทางสุขภาพผ่านระบบ AI (LangGraph)</strong> และทำการแจ้งเตือนครอบครัวหรือผู้ดูแลอย่างทันท่วงทีเมื่อพบความผิดปกติ</p>

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">การแบ่งปันข้อมูล (Data Sharing)</h2>
          <p>ข้อมูลของคุณจะถูกแชร์กับ <strong className="text-foreground">ผู้ที่ได้รับอนุญาตใน Workspace เดียวกันเท่านั้น</strong> (เช่น ลูกหลาน และผู้ดูแล) เราขอยืนยันว่า <strong className="text-foreground">จะไม่มีการขายข้อมูลนี้ให้บริษัทประกันหรือบุคคลที่ 3 เด็ดขาด</strong></p>

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">สิทธิของเจ้าของข้อมูล</h2>
          <p>คุณมีสิทธิ์ขอลบข้อมูล (Right to Erasure / Right to be Forgotten) ลูกค้ามีสิทธิ์ร้องขอให้ลบข้อมูลสุขภาพทั้งหมดออกจากระบบเมื่อทำการยกเลิกแพ็กเกจหรือยุติการใช้งาน</p>
        </div>
      </div>
    </div>
  );
}
