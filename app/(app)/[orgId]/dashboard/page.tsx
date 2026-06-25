"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useActiveOrganization } from "@/lib/auth-client";
import Navigation from "@/app/components/ui/Navigation";
import { usePortalAccess } from "@/app/hooks/usePortalAccess";

interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  roomNumber: string | null;
  status: "stable" | "monitoring" | "critical";
  lastUpdate: string;
  caregiverName: string | null;
  pineconeSyncStatus: "PENDING" | "SUCCESS" | "FAILED";
}

const statusLabels: Record<PatientRow["status"], { label: string; className: string }> = {
  stable: { label: "Stable", className: "bg-emerald-100 text-emerald-700" },
  monitoring: { label: "Monitoring", className: "bg-amber-100 text-amber-700" },
  critical: { label: "Critical", className: "bg-rose-100 text-rose-700" },
};

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม. ที่แล้ว`;
  return `${Math.floor(hrs / 24)} วันที่แล้ว`;
}

export default function OrgDashboard() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: activeOrg } = useActiveOrganization();
  const { access } = usePortalAccess(orgId);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryingPatientId, setRetryingPatientId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await fetch(`/api/patients?orgId=${orgId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load patients");
        setPatients(json.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, [orgId]);

  const retryAiSync = async (patientId: string) => {
    setRetryingPatientId(patientId);
    setError("");
    try {
      const res = await fetch(`/api/patients/${patientId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to retry AI sync");
      setPatients((current) =>
        current.map((patient) =>
          patient.id === patientId
            ? { ...patient, pineconeSyncStatus: json.data?.pineconeSyncStatus ?? patient.pineconeSyncStatus }
            : patient
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI sync retry failed");
    } finally {
      setRetryingPatientId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="app-nav-offset pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
            {activeOrg?.name || "Workspace Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {access?.isOwner
              ? "จัดการ workspace — เชิญทีมและเลือกแผนการใช้งาน"
              : "Manage your patients, caregivers, and alerts"}
          </p>
        </div>

        {/* Team & Billing links moved to Settings via Navigation menu */}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {access?.canAccessCaregiver && (
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-2xl mb-3">👨‍⚕️</div>
            <h3 className="text-lg font-bold text-foreground">Caregiver Portal</h3>
            <p className="text-sm text-muted-foreground mb-4">เข้าสู่ระบบบันทึกข้อมูลสำหรับพยาบาลและผู้ดูแล</p>
            <Link href={`/${orgId}/caregiver`} className="w-full py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors">
              Enter Portal
            </Link>
          </div>
          )}

          {access?.canAccessFamily && (
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-3">👨‍👩‍👧‍👦</div>
            <h3 className="text-lg font-bold text-foreground">Family Portal</h3>
            <p className="text-sm text-muted-foreground mb-4">เข้าสู่หน้าจอสำหรับครอบครัวเพื่อดูข้อมูลแบบ Real-time</p>
            <Link href={`/${orgId}/family`} className="w-full py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors">
              Enter Portal
            </Link>
          </div>
          )}

          {access?.canAccessFamily && (
          <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-900 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-rose-200 text-rose-700 rounded-full flex items-center justify-center text-2xl mb-3">🚨</div>
            <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200">แจ้งเหตุฉุกเฉิน</h3>
            <p className="text-sm text-rose-700/80 mb-4">ส่งสัญญาณฉุกเฉินถึงครอบครัวทันที + โทร 1669</p>
            <Link href={`/${orgId}/emergency`} className="w-full py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors">
              เปิดหน้าฉุกเฉิน
            </Link>
          </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Active Patients</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">{patients.length} คน</span>
              {access?.canAccessDashboard && (
                <Link
                  href={`/${orgId}/patients/new`}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                  + ลงทะเบียนผู้ป่วย
                </Link>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="space-y-3 animate-pulse mt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted/60 rounded-xl"></div>
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>ยังไม่มีผู้ป่วยในระบบ</p>
              {access?.canAccessDashboard ? (
                <Link
                  href={`/${orgId}/patients/new`}
                  className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark"
                >
                  เริ่มลงทะเบียนผู้สูงอายุ
                </Link>
              ) : (
                <p className="text-sm mt-1">ติดต่อเจ้าของ workspace เพื่อเพิ่มผู้ป่วย</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Last Update</th>
                    <th className="pb-3 font-medium">Assigned Caregiver</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-foreground">
                  {patients.map((patient) => {
                    const status = statusLabels[patient.status];
                    return (
                      <tr key={patient.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                        <td className="py-4 font-medium text-foreground">
                          {patient.firstName} {patient.lastName}
                          {patient.roomNumber && (
                            <span className="text-muted-foreground font-normal ml-2">ห้อง {patient.roomNumber}</span>
                          )}
                          {access?.canAccessDashboard && patient.pineconeSyncStatus === "FAILED" && (
                            <span className="ml-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                              ซิงค์ข้อมูล AI ไม่สำเร็จ
                              <button
                                type="button"
                                onClick={() => retryAiSync(patient.id)}
                                disabled={retryingPatientId === patient.id}
                                className="underline underline-offset-2 disabled:opacity-50"
                              >
                                {retryingPatientId === patient.id ? "กำลังลองใหม่..." : "กดลองใหม่"}
                              </button>
                            </span>
                          )}
                        </td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-4">{formatRelativeTime(patient.lastUpdate)}</td>
                        <td className="py-4">{patient.caregiverName ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
