import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy - CareSync",
  description: "นโยบายคุกกี้สำหรับ CareSync",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-8">นโยบายคุกกี้ (Cookie Policy)</h1>
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>เว็บไซต์ CareSync มีการใช้งานคุกกี้เพื่อประสบการณ์ที่ดีที่สุดในการใช้งานของคุณ</p>

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">การใช้ Session/Cookies</h2>
          <p>เราใช้คุกกี้เพื่อจดจำสถานะการเข้าสู่ระบบ (Login Session) ของผู้ใช้ เพื่อให้คุณไม่ต้องเข้าสู่ระบบใหม่ทุกครั้งที่เปลี่ยนหน้า</p>

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">การใช้ Analytics</h2>
          <p>เรามีการใช้เครื่องมือวิเคราะห์ (เช่น Google Analytics) เพื่อดูพฤติกรรมการใช้งานในหน้า Dashboard โดยข้อมูลที่เก็บจะเป็นแบบไม่ระบุตัวตน (Anonymous) ซึ่งช่วยให้เราสามารถพัฒนาและปรับปรุงแพลตฟอร์มให้ดียิ่งขึ้นต่อไป</p>
        </div>
      </div>
    </div>
  );
}
