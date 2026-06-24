"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

type SessionUserWithConsent = {
  termsAccepted?: boolean;
};

export default function ConsentPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    } else if (!isPending && (session?.user as SessionUserWithConsent | undefined)?.termsAccepted) {
      router.replace("/dashboard");
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/consent", { method: "POST" });
      if (res.ok) {
        // Force refresh session/router to pick up termsAccepted = true
        window.location.href = "/dashboard";
      } else {
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    await signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="max-w-2xl w-full bg-card rounded-2xl shadow-xl border border-border p-8 flex flex-col max-h-[90vh]">
        <h1 className="text-2xl font-bold text-foreground mb-6">ข้อกำหนดการใช้งาน (Terms of Service)</h1>
        
        <div className="flex-1 overflow-y-auto pr-4 space-y-4 text-sm text-muted-foreground bg-muted/30 p-6 rounded-lg border border-border">
          <p>
            ยินดีต้อนรับสู่ CareSync แพลตฟอร์มการดูแลผู้ป่วย กรุณาอ่านและทำความเข้าใจข้อกำหนดการใช้งานดังต่อไปนี้ก่อนเข้าสู่ระบบ
          </p>
          <h3 className="font-semibold text-foreground pt-2">1. การเก็บรักษาข้อมูลส่วนบุคคล</h3>
          <p>
            เราให้ความสำคัญกับความเป็นส่วนตัวของข้อมูลผู้ป่วยและผู้ดูแล ระบบจะเก็บรักษาข้อมูลอย่างปลอดภัยตามมาตรฐาน และจะไม่นำข้อมูลไปเปิดเผยให้บุคคลที่สามโดยไม่ได้รับอนุญาต
          </p>
          <h3 className="font-semibold text-foreground pt-2">2. การให้สิทธิ์การเข้าถึงข้อมูล</h3>
          <p>
            การมอบสิทธิ์ให้บุคคลในครอบครัวหรือพยาบาล ถือเป็นความรับผิดชอบของผู้ดูแลหลัก (Owner) ระบบจะไม่รับผิดชอบต่อความเสียหายที่เกิดจากการให้สิทธิ์ผิดพลาด
          </p>
          <h3 className="font-semibold text-foreground pt-2">3. ข้อมูลทางการแพทย์ (AI Insight)</h3>
          <p>
            ข้อมูลและการวิเคราะห์ที่ได้รับจาก AI เป็นเพียงคำแนะนำเบื้องต้น ไม่สามารถทดแทนการวินิจฉัยจากแพทย์เฉพาะทาง หากมีเหตุฉุกเฉินทางการแพทย์ กรุณาติดต่อสายด่วน 1669 ทันที
          </p>
          <h3 className="font-semibold text-foreground pt-2">4. ระยะเวลาการเก็บรักษาข้อมูล (Data Retention)</h3>
          <p>
            ในกรณีที่คุณขาดการต่ออายุแพ็กเกจ (Subscription Expired) ระบบจะเข้าสู่โหมดดูข้อมูลย้อนหลัง (Read-Only) และจะเก็บรักษาประวัติข้อมูลของผู้ป่วยไว้ให้ดูย้อนหลังเป็นเวลา 1 ปี หลังจากนั้นระบบจะทำการลบข้อมูลโดยอัตโนมัติเพื่อความเป็นส่วนตัวและสอดคล้องกับนโยบาย PDPA (Zero Data Retention)
          </p>
          <p className="pt-4 font-medium text-foreground">
            การกดยอมรับหมายความว่าคุณได้อ่าน เข้าใจ และตกลงที่จะปฏิบัติตามข้อกำหนดและเงื่อนไขทั้งหมดข้างต้น
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
          <button
            onClick={handleDecline}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg font-medium text-foreground bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            ไม่ยอมรับ (ล็อกเอาท์)
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg font-medium text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? "กำลังดำเนินการ..." : "ฉันยอมรับเงื่อนไข"}
          </button>
        </div>
      </div>
    </div>
  );
}
