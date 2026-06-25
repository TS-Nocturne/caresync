import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import MarketingNav from "@/app/components/marketing/MarketingNav";

export const metadata: Metadata = {
  title: "CareSync — ระบบดูแลผู้สูงอายุอัจฉริยะแบบครบวงจร",
  description: "แพลตฟอร์มดูแลผู้สูงอายุสำหรับครอบครัว รองรับการบันทึกและแสดงข้อมูลสุขภาพเพื่อประกอบการติดตามอาการแบบ 24/7",
};

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <MarketingNav />

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Powered by LangGraph & health data monitoring
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 max-w-4xl mx-auto leading-tight animate-fade-in" style={{ animationDelay: "100ms" }}>
          The operating system for <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">modern eldercare</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "200ms" }}>
          ยกระดับการดูแลผู้สูงอายุด้วยแพลตฟอร์มเดียวที่เชื่อมต่อผู้ดูแล ครอบครัว และ AI เข้าด้วยกันแบบ Real-time
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-primary text-white text-lg font-semibold rounded-full hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
            Get Started for Free
          </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Everything you need to care for your loved ones</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">ฟีเจอร์ครบครันที่ออกแบบมาเพื่อลดภาระงานของผู้ดูแล และสร้างความอุ่นใจให้ครอบครัว</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-muted border border-border">
              <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center text-2xl mb-4">🩺</div>
              <h3 className="text-xl font-bold text-foreground mb-2">Caregiver Dashboard</h3>
              <p className="text-muted-foreground">บันทึกสัญญาณชีพ, ลายเซ็นดิจิทัลรับยา, และ Pain Body Map ที่ใช้งานง่ายลดข้อผิดพลาด</p>
            </div>
            <div className="p-6 rounded-2xl bg-muted border border-border">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-xl font-bold text-foreground mb-2">Family Portal</h3>
              <p className="text-muted-foreground">Dashboard สำหรับญาติ ดูสถานะ Real-time และปฏิทินนัดหมายร่วมกันอย่างโปร่งใส</p>
            </div>
            <div className="p-6 rounded-2xl bg-muted border border-border">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-2xl mb-4">🚨</div>
              <h3 className="text-xl font-bold text-foreground mb-2">AI Health Data Monitor</h3>
              <p className="text-muted-foreground">แสดงข้อมูลสุขภาพและสัญญาณเฝ้าระวังเบื้องต้น พร้อมช่องทางส่งต่อให้บุคลากรทางการแพทย์ประเมิน</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 overflow-hidden flex items-center justify-center grayscale opacity-70">
              <Image src="/logo.png" alt="CareSync Logo" fill className="object-contain" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground">© 2026 CareSync. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/cookie-policy" className="text-muted-foreground hover:text-foreground transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
