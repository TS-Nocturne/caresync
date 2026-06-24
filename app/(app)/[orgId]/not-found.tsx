import Link from "next/link";
import ThemeToggle from "@/app/components/ui/ThemeToggle";

export default function OrgNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full p-8 text-center animate-fade-in">
        <div className="text-8xl mb-6">🏥</div>
        <h2 className="text-3xl font-bold text-foreground mb-4">ไม่พบห้องดูแลผู้ป่วย</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          ห้องผู้ป่วยที่คุณพยายามเข้าถึงไม่มีอยู่จริง อาจถูกลบไปแล้ว หรือคุณไม่มีสิทธิ์เข้าถึงห้องนี้
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-sm gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          กลับไปเลือกห้องใหม่
        </Link>
      </div>
    </div>
  );
}
