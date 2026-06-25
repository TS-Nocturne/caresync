"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

interface BillingData {
  plan: string;
  status: string;
  memberCount: number;
  currentPeriodEnd: string | null;
  limits: { label: string; priceLabel: string; maxMembers: number };
  plans: Array<{ plan: string; label: string; priceLabel: string; maxMembers: number }>;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  isTrial: boolean;
}

export default function BillingSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;
  
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [interval, setInterval] = useState<"month" | "semi_annual" | "year">("year");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/billing?orgId=${orgId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setData(json.data);
    else setError(json.error);
  }, [orgId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const upgrade = async () => {
    setLoading("upgrade");
    setError("");
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, plan: "PRO", interval }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.data?.url) window.location.href = json.data.url;
      else {
        setError("");
        load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปเกรดไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to open portal");
      if (json.data?.url) window.location.href = json.data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการเปิด Portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const pricing = {
    month: { price: "฿299", suffix: "/เดือน", savings: null },
    semi_annual: { price: "฿1,500", suffix: "/6 เดือน", savings: "ตกเดือนละ ฿250" },
    year: { price: "฿2,400", suffix: "/ปี", savings: "ตกเดือนละ ฿200 — ประหยัด 33%" },
  };

  return (
    <>
      <main className="pt-24 pb-12 max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">การเรียกเก็บเงิน (Billing & Subscription)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            จัดการแพ็กเกจและข้อมูลการชำระเงินของ Workspace
          </p>
          {searchParams.get("success") && (
            <p className="mt-2 text-sm text-emerald-600 font-medium p-3 bg-emerald-50 rounded-lg">ชำระเงินสำเร็จ — ขอบคุณที่ไว้วางใจ CareSync ครับ!</p>
          )}
          {searchParams.get("canceled") && (
            <p className="mt-2 text-sm text-rose-600 font-medium p-3 bg-rose-50 rounded-lg">ทำรายการไม่สำเร็จ หรือถูกยกเลิก</p>
          )}
          <Link href={`/${orgId}/settings/team`} className="text-sm text-primary hover:underline mt-4 inline-block">
            ← กลับจัดการทีม
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm">{error}</div>
        )}

        {data && (
          <>
            {data.hasStripeCustomer ? (
              // ACTIVE SUBSCRIPTION UI
              <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
                <p className="text-sm text-muted-foreground">แพ็กเกจปัจจุบัน</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-2xl font-bold text-primary">CareSync Pro</p>
                  {data.status === "ACTIVE" && (
                    <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">Active</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-4 font-medium">
                  วันที่บิลถัดไปจะตัดเงิน: <span className="text-foreground">{data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}</span>
                </p>
                <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center gap-4">
                  <button 
                    onClick={openPortal} 
                    disabled={portalLoading}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-100 text-slate-900 text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    {portalLoading ? "กำลังโหลด..." : "จัดการบัตรเครดิต & การสมัครสมาชิก"}
                  </button>
                </div>
              </div>
            ) : (
              // UPGRADE UI
              <>
                {/* Trial Banner */}
                {!data.hasStripeCustomer && data.plan === "PRO" && data.status === "ACTIVE" && data.currentPeriodEnd && new Date(data.currentPeriodEnd) > new Date() && (
                  <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                    <div className="text-emerald-500 mt-0.5">⏱️</div>
                    <div>
                      <p className="text-emerald-800 font-bold text-sm">คุณกำลังอยู่ในช่วงทดลองใช้ฟรี</p>
                      <p className="text-emerald-600 text-xs mt-1">
                        ทดลองใช้ฟรีถึงวันที่ {new Date(data.currentPeriodEnd).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })} — สมัครสมาชิกวันนี้เพื่อให้การใช้งานลื่นไหลไม่มีสะดุด
                      </p>
                    </div>
                  </div>
                )}

                {/* Toggle Switch */}
                <div className="flex justify-center mb-8">
                  <div className="bg-slate-200 p-1 rounded-full flex relative overflow-hidden max-w-full w-[460px]">
                    <div 
                      className="absolute top-1 bottom-1 w-[33.33%] bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out"
                      style={{
                        transform: interval === "month" ? "translateX(0%)" : interval === "semi_annual" ? "translateX(100%)" : "translateX(200%)",
                      }}
                    />
                    <button
                      onClick={() => setInterval("month")}
                      className={`flex-1 relative z-10 py-2.5 text-sm font-semibold rounded-full transition-colors ${interval === "month" ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
                    >
                      รายเดือน
                    </button>
                    <button
                      onClick={() => setInterval("semi_annual")}
                      className={`flex-1 relative z-10 py-2.5 text-sm font-semibold rounded-full transition-colors ${interval === "semi_annual" ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
                    >
                      6 เดือน
                    </button>
                    <button
                      onClick={() => setInterval("year")}
                      className={`flex-1 relative z-10 py-2.5 text-sm font-semibold rounded-full transition-colors flex items-center justify-center gap-1 ${interval === "year" ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
                    >
                      รายปี <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${interval === "year" ? "bg-emerald-100 text-emerald-700" : "bg-slate-300 text-slate-700"}`}>-33%</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500/20 to-transparent w-64 h-64 blur-3xl -z-10 rounded-full" />
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                    <div>
                      <div className="inline-block bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
                        {interval === "year" ? "Best Value" : "CareSync Pro"}
                      </div>
                      <h3 className="text-2xl font-bold text-white">อัปเกรดเป็นสมาชิกระยะยาว</h3>
                      <p className="text-slate-400 text-sm mt-1">ใช้งานไม่จำกัดสมาชิก พร้อม AI ดูแล</p>
                    </div>
                    
                    <div className="text-left sm:text-right">
                      <div className="text-4xl font-extrabold text-white transition-all">
                        {pricing[interval].price} <span className="text-lg font-medium text-slate-400">{pricing[interval].suffix}</span>
                      </div>
                      <div className="h-6 mt-1">
                        {pricing[interval].savings && (
                          <span className="text-emerald-400 text-sm font-medium">{pricing[interval].savings}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-2xl p-4 mb-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300 leading-relaxed">
                        ฉันยอมรับเงื่อนไขการสมัครสมาชิก และเข้าใจว่าระบบจะต่ออายุอัตโนมัติ (สามารถยกเลิกได้ตลอดเวลา)
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={loading !== null || !termsAccepted}
                    onClick={upgrade}
                    className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                  >
                    {loading === "upgrade" ? "กำลังดำเนินการ..." : "สมัครสมาชิก CareSync Pro"}
                  </button>
                </div>
              </>
            )}

            {data.hasStripeCustomer && data.plan === "PRO" && (
              <div className="text-center mt-12 mb-4">
                <button 
                  onClick={() => setShowCancelModal(true)} 
                  className="text-sm font-medium text-muted-foreground hover:text-rose-600 transition-colors underline decoration-muted-foreground/30 hover:decoration-rose-600/50 underline-offset-4"
                >
                  ยกเลิกการสมัครสมาชิก (Cancel Subscription)
                </button>
              </div>
            )}

            {!data.stripeConfigured && (
              <p className="text-xs text-muted-foreground mt-6 text-center">
                โหมด dev: อัปเกรดได้ทันทีโดยไม่ผ่าน Stripe (ตั้งค่า STRIPE_* ใน .env สำหรับ production)
              </p>
            )}
          </>
        )}
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-3xl p-8 max-w-md w-full shadow-2xl border border-border relative">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xl mb-6">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-foreground mb-3">ยืนยันการยกเลิกการสมัครสมาชิก</h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              แพ็กเกจ CareSync Pro ของคุณจะยังคงใช้งานได้เต็มรูปแบบไปจนถึงวันที่ <span className="font-semibold text-foreground">{data?.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : ""}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              หลังจากนั้น บัญชีของคุณจะถูกปรับเป็น <span className="font-semibold">โหมดอ่านข้อมูล (Read-Only)</span> โดยมีผลกระทบดังนี้:
            </p>
            
            <ul className="space-y-3 text-sm text-muted-foreground mb-8 bg-muted/50 p-4 rounded-2xl">
              <li className="flex items-start gap-3">
                <span className="text-rose-500 shrink-0">❌</span> 
                <span>ไม่สามารถบันทึกสัญญาณชีพ อาการ หรือตารางยาใหม่ได้</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-rose-500 shrink-0">❌</span> 
                <span>ระบบ AI สำหรับแสดงข้อมูลเฝ้าระวังเบื้องต้นจะหยุดทำงาน</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 shrink-0">✅</span> 
                <span>ข้อมูลประวัติสุขภาพเดิมทั้งหมดจะยังคงปลอดภัย และเปิดดูย้อนหลังได้เสมอ</span>
              </li>
            </ul>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={openPortal} 
                className="flex-1 py-3 px-4 rounded-xl border-2 border-rose-100 text-rose-600 bg-rose-50/50 font-semibold hover:bg-rose-100 hover:border-rose-200 transition-colors"
              >
                ยืนยันการยกเลิก
              </button>
              <button 
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
              >
                ใช้งาน Pro ต่อไป
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
