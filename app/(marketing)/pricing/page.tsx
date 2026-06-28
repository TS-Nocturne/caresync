"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import MedicalDisclaimer from "@/app/components/ui/MedicalDisclaimer";

export default function PricingPage() {
  const [interval, setInterval] = useState<"month" | "semi_annual" | "year">("year");

  const pricing = {
    month: { price: "฿299", suffix: "/เดือน", savings: null },
    semi_annual: { price: "฿1,500", suffix: "/6 เดือน", savings: "ตกเดือนละ ฿250" },
    year: { price: "฿2,400", suffix: "/ปี", savings: "ตกเดือนละ ฿200 — ประหยัด 33%" },
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-28 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8">
      {/* Navigation - simplified for pricing page */}
      <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden flex items-center justify-center">
              <Image src="/logo.png" alt="CareSync Logo" fill className="object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-slate-800">CareSync</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Log in</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 animate-fade-in">
          เหมาจ่าย ยิ่งยาว ยิ่งคุ้ม
        </h1>
        <p className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-12 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "100ms" }}>
          แพ็กเกจเดียวที่ให้คุณปลดล็อกทุกฟีเจอร์ของ CareSync
        </p>

        {/* Toggle Switch */}
        <div className="flex justify-center mb-10 sm:mb-12 animate-fade-in" style={{ animationDelay: "150ms" }}>
          <div className="bg-slate-200 p-1 rounded-full flex relative overflow-hidden w-full max-w-[460px]">
            <div 
              className="absolute top-1 bottom-1 w-[33.33%] bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out"
              style={{
                transform: interval === "month" ? "translateX(0%)" : interval === "semi_annual" ? "translateX(100%)" : "translateX(200%)",
              }}
            />
            <button
              onClick={() => setInterval("month")}
              className={`flex-1 relative z-10 px-1 py-2.5 text-xs sm:text-sm font-semibold rounded-full transition-colors ${interval === "month" ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setInterval("semi_annual")}
              className={`flex-1 relative z-10 px-1 py-2.5 text-xs sm:text-sm font-semibold rounded-full transition-colors ${interval === "semi_annual" ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
            >
              6 เดือน
            </button>
            <button
              onClick={() => setInterval("year")}
              className={`flex-1 relative z-10 px-1 py-2.5 text-xs sm:text-sm font-semibold rounded-full transition-colors flex items-center justify-center gap-1 ${interval === "year" ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
            >
              รายปี <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${interval === "year" ? "bg-emerald-100 text-emerald-700" : "bg-slate-300 text-slate-700"}`}>-33%</span>
            </button>
          </div>
        </div>

        {/* Single PRO Card */}
        <div className="flex justify-center max-w-lg mx-auto animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="w-full bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-800 shadow-2xl flex flex-col relative transform hover:-translate-y-1 transition-transform">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
              {interval === "year" ? "Best Value" : "CareSync Pro"}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 mt-2">Professional</h3>
            <p className="text-slate-400 text-sm mb-6">สำหรับครอบครัวที่ต้องการการดูแลเต็มรูปแบบ</p>
            
            <div className="mb-2 min-h-[4rem] flex flex-col justify-center">
              <div>
                <span className="text-4xl sm:text-5xl font-extrabold text-white transition-all">{pricing[interval].price}</span>
                <span className="text-slate-400 ml-1">{pricing[interval].suffix}</span>
              </div>
              <div className="h-6 mt-2">
                {pricing[interval].savings && (
                  <span className="text-emerald-400 text-sm font-medium px-3 py-1 bg-emerald-500/10 rounded-full inline-block animate-fade-in">
                    {pricing[interval].savings}
                  </span>
                )}
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-1 text-left mt-8">
              <li className="flex items-center gap-3 text-slate-300">
                <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ผู้สูงอายุสูงสุด 10 ท่าน
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ไม่จำกัดจำนวนผู้ดูแล (Caregiver & Family)
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ประวัติย้อนหลัง 1 ปีเต็ม
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ระบบ Care Coordination Monitor สำหรับข้อมูลที่ผู้ดูแลต้องตรวจสอบ
              </li>
            </ul>
            <div className="mb-6">
              <MedicalDisclaimer compact tone="onDark" />
            </div>
            <Link href="/signup" className="w-full py-4 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40">
              เริ่มทดลองใช้ฟรี 14 วัน
            </Link>
            <p className="text-xs text-slate-500 mt-4 text-center">เริ่มเก็บเงินหลังหมดช่วงทดลองใช้ สามารถยกเลิกได้ตลอดเวลา</p>
          </div>
        </div>
      </div>
    </div>
  );
}
