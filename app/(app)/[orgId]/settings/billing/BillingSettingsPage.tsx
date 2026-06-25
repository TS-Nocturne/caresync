"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

type BillingInterval = "month" | "semi_annual" | "year";

interface BillingPlan {
  plan: "PRO";
  interval: BillingInterval;
  label: string;
  priceLabel: string;
  maxMembers: number;
  stripePriceId: string;
}

interface BillingData {
  plan: string;
  status: string;
  currentInterval: BillingInterval | null;
  memberCount: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: { label: string; priceLabel: string; maxMembers: number };
  plans: BillingPlan[];
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
  isTrial: boolean;
}

const PLAN_COPY: Record<
  BillingInterval,
  { name: string; price: string; cadence: string; note: string; savings?: string }
> = {
  month: {
    name: "รายเดือน",
    price: "฿299",
    cadence: "ต่อเดือน",
    note: "เหมาะกับการเริ่มต้นและปรับเปลี่ยนได้เร็ว",
  },
  semi_annual: {
    name: "6 เดือน",
    price: "฿1,500",
    cadence: "ต่อ 6 เดือน",
    note: "เฉลี่ย ฿250 ต่อเดือน",
    savings: "ประหยัดกว่า",
  },
  year: {
    name: "รายปี",
    price: "฿2,400",
    cadence: "ต่อปี",
    note: "เฉลี่ย ฿200 ต่อเดือน",
    savings: "คุ้มสุด",
  },
};

function formatDate(value: string | null) {
  if (!value) return "ยังไม่มีข้อมูล";
  return new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BillingSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;

  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("year");
  const [confirmInterval, setConfirmInterval] = useState<BillingInterval | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/billing?orgId=${orgId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setData(json.data);
      setSelectedInterval(json.data.currentInterval ?? "year");
      setError("");
    } else {
      setError(json.error || "โหลดข้อมูล Billing ไม่สำเร็จ");
    }
  }, [orgId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const activeInterval = data?.currentInterval;
  const pendingPlan = confirmInterval ? PLAN_COPY[confirmInterval] : null;
  const confirmActionLabel = useMemo(() => {
    if (!data || !confirmInterval) return "";
    if (!data.hasStripeSubscription) return "เริ่มทดลองใช้ฟรี 14 วัน";
    if (data.cancelAtPeriodEnd && data.currentInterval === confirmInterval) return "ยืนยันใช้งานต่อ";
    return "ยืนยันเปลี่ยนแผน";
  }, [confirmInterval, data]);

  const submitPlanChange = async () => {
    if (!confirmInterval) return;
    setLoading(`plan-${confirmInterval}`);
    setError("");

    try {
      const res = await fetch("/api/billing", {
        method: data?.hasStripeSubscription ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, plan: "PRO", interval: confirmInterval }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "เปลี่ยนแผนไม่สำเร็จ");

      if (json.data?.url) {
        window.location.href = json.data.url;
        return;
      }

      setConfirmInterval(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปลี่ยนแผนไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  };

  const cancelAtPeriodEnd = async () => {
    setLoading("cancel");
    setError("");

    try {
      const res = await fetch("/api/billing", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ยกเลิกแผนไม่สำเร็จ");

      setShowCancelModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยกเลิกแผนไม่สำเร็จ");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">การเรียกเก็บเงิน (Billing & Subscription)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ดูแผนปัจจุบัน เปลี่ยนรอบชำระเงิน และยกเลิกการต่ออายุรอบถัดไป
          </p>
          {searchParams.get("success") && (
            <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              ชำระเงินสำเร็จ ระบบจะอัปเดตข้อมูลหลัง Stripe ยืนยันรายการ
            </p>
          )}
          {searchParams.get("canceled") && (
            <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">
              รายการชำระเงินถูกยกเลิก
            </p>
          )}
          <Link href={`/${orgId}/settings/team`} className="text-sm text-primary hover:underline mt-4 inline-block">
            กลับไปจัดการทีม
          </Link>
        </div>

        {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {data && (
          <>
            <section className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">แผนที่ใช้อยู่ตอนนี้</p>
                  <h2 className="mt-1 text-2xl font-bold text-foreground">
                    {data.plan === "PRO" ? "CareSync Pro" : "ยังไม่มีแพ็กเกจ"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    รอบชำระเงิน:{" "}
                    <span className="font-semibold text-foreground">
                      {activeInterval ? PLAN_COPY[activeInterval].name : data.isTrial ? "ทดลองใช้งาน" : "-"}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    วันหมดรอบปัจจุบัน:{" "}
                    <span className="font-semibold text-foreground">{formatDate(data.currentPeriodEnd)}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    {data.status}
                  </span>
                  {data.cancelAtPeriodEnd && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                      ไม่ต่ออายุ
                    </span>
                  )}
                </div>
              </div>

              {data.cancelAtPeriodEnd && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  แผนนี้ถูกตั้งให้ยกเลิกเมื่อหมดรอบวันที่ {formatDate(data.currentPeriodEnd)} และจะไม่เรียกเก็บเงินรอบถัดไป
                </div>
              )}
            </section>

            <section className="mb-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">เลือกแผนการชำระเงิน</h2>
                  <p className="text-sm text-muted-foreground">
                    หากเปลี่ยนแผน ระบบจะใช้ราคาใหม่ในการเรียกเก็บเงินเมื่อรอบปัจจุบันหมดอายุ
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  สมาชิกปัจจุบัน {data.memberCount} คน
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {data.plans.map((plan) => {
                  const copy = PLAN_COPY[plan.interval];
                  const isCurrent = data.hasStripeSubscription && activeInterval === plan.interval && !data.cancelAtPeriodEnd;
                  const isResume = data.cancelAtPeriodEnd && activeInterval === plan.interval;
                  const isSelected = selectedInterval === plan.interval;

                  return (
                    <button
                      key={plan.interval}
                      type="button"
                      onClick={() => {
                        setSelectedInterval(plan.interval);
                        if (!isCurrent) setConfirmInterval(plan.interval);
                      }}
                      className={`relative rounded-2xl border p-5 text-left transition-all ${
                        isCurrent || isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted/40"
                      }`}
                    >
                      {copy.savings && (
                        <span className="absolute right-4 top-4 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          {copy.savings}
                        </span>
                      )}
                      <div className="pr-20">
                        <h3 className="text-base font-bold text-foreground">{copy.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{copy.note}</p>
                      </div>
                      <div className="mt-6">
                        <span className="text-3xl font-extrabold text-foreground">{copy.price}</span>
                        <span className="ml-1 text-sm text-muted-foreground">{copy.cadence}</span>
                      </div>
                      <div className="mt-5">
                        {isCurrent ? (
                          <span className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                            กำลังใช้งาน
                          </span>
                        ) : (
                          <span className="inline-flex rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground">
                            {isResume ? "กลับมาใช้งานต่อ" : data.hasStripeSubscription ? "เปลี่ยนเป็นแผนนี้" : "เริ่มทดลองใช้ฟรี 14 วัน"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {data.hasStripeSubscription && !data.cancelAtPeriodEnd && (
              <div className="mb-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="text-sm font-semibold text-muted-foreground underline underline-offset-4 transition-colors hover:text-rose-600"
                >
                  ยกเลิกแผนเมื่อหมดรอบปัจจุบัน
                </button>
              </div>
            )}

            {!data.stripeConfigured && (
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Dev mode: ยังไม่ได้ตั้งค่า Stripe ครบ ระบบจะจำลองการเปลี่ยนแผนในฐานข้อมูล
              </p>
            )}
          </>
        )}
      </main>

      {confirmInterval && pendingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-foreground">ยืนยันการเปลี่ยนแผน</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              คุณกำลังเลือกแผน {pendingPlan.name} ราคา {pendingPlan.price} {pendingPlan.cadence}
              {data?.hasStripeSubscription
                ? " ระบบจะยังไม่เรียกเก็บเงินทันที และจะใช้แผนใหม่นี้เมื่อรอบปัจจุบันหมดอายุ"
                : " ระบบจะพาไปหน้าชำระเงินเพื่อเริ่มใช้งานแผนนี้"}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setConfirmInterval(null)}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={submitPlanChange}
                disabled={loading !== null}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
              >
                {loading ? "กำลังดำเนินการ..." : confirmActionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-foreground">ยืนยันการยกเลิกแผน</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              ระบบจะไม่เรียกเก็บเงินในรอบถัดไป คุณยังใช้งาน CareSync Pro ได้จนถึงวันที่{" "}
              <span className="font-semibold text-foreground">{formatDate(data.currentPeriodEnd)}</span>
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={cancelAtPeriodEnd}
                disabled={loading !== null}
                className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                {loading === "cancel" ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
              </button>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
              >
                ใช้งานต่อ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
