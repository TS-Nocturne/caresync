"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { organization } from "@/lib/auth-client";

export interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
  homePath: string;
  patientName: string | null;
  patientRoom: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
}

interface WorkspaceSelectorProps {
  workspaces: WorkspaceInfo[];
  userName?: string;
}

function getRoleStyle(role: string) {
  switch (role) {
    case "owner":
    case "admin":
      return "workspace-card__role--owner";
    default:
      return "workspace-card__role--caregiver";
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case "owner":
      return "👑";
    case "admin":
      return "⚙️";
    default:
      return "👨‍⚕️";
  }
}

export default function WorkspaceSelector({ workspaces, userName }: WorkspaceSelectorProps) {
  const router = useRouter();
  const [removedOrgIds, setRemovedOrgIds] = useState<Set<string>>(() => new Set());
  const [removingOrgId, setRemovingOrgId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const items = workspaces.filter((workspace) => !removedOrgIds.has(workspace.id));

  const handleSelect = async (ws: WorkspaceInfo) => {
    if (ws.isDeleted) return;

    try {
      await organization.setActive({ organizationId: ws.id });
    } catch {
      // Fallback to route navigation if Better Auth cannot set the active org.
    }

    router.push(ws.homePath);
  };

  const removeDeletedWorkspace = async (ws: WorkspaceInfo) => {
    setRemovingOrgId(ws.id);
    setError("");

    try {
      const res = await fetch(`/api/me/workspace?orgId=${encodeURIComponent(ws.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "เอาห้องออกจากเมนูไม่สำเร็จ");
      setRemovedOrgIds((current) => new Set(current).add(ws.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "เอาห้องออกจากเมนูไม่สำเร็จ");
    } finally {
      setRemovingOrgId(null);
    }
  };

  return (
    <div className="workspace-selector">
      <div className="workspace-selector__header">
        <div className="flex justify-center mb-6">
          <div className="relative h-12 w-12 overflow-hidden">
            <Image src="/logo.png" alt="CareSync Logo" fill className="object-contain" />
          </div>
        </div>
        <h1 className="workspace-selector__title">
          สวัสดี{userName ? ` ${userName}` : ""}
        </h1>
        <p className="workspace-selector__subtitle">
          เลือกห้องที่คุณต้องการเข้าทำงานวันนี้
        </p>
        <Link
          href="/onboarding?create=1"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-dark"
        >
          + สร้างห้องดูแลใหม่
        </Link>
      </div>

      {error && (
        <div className="mb-4 w-full max-w-2xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="workspace-selector__grid">
        {items.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            ไม่มีห้องในเมนูของคุณแล้ว
          </div>
        )}
        {items.map((ws) => (
          <div
            key={ws.id}
            className={`workspace-card ${
              ws.isDeleted
                ? "border-rose-300 bg-rose-50/80 shadow-none hover:translate-y-0 hover:border-rose-300 hover:shadow-none dark:border-rose-900 dark:bg-rose-950/20"
                : ""
            }`}
            onClick={() => handleSelect(ws)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") void handleSelect(ws);
            }}
            id={`workspace-card-${ws.id}`}
            aria-disabled={ws.isDeleted}
          >
            {!ws.isDeleted && (
              <svg className="workspace-card__arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            )}

            <div className={`workspace-card__icon ${ws.isDeleted ? "bg-none bg-rose-600 text-white shadow-none" : ""}`}>
              🏠
            </div>

            <h3 className="workspace-card__name">{ws.name}</h3>

            {ws.isDeleted && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-white/70 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                <p className="font-bold">ห้องนี้ได้ถูกลบแล้ว</p>
                <p className="mt-1 text-xs leading-5">
                  เจ้าของห้องลบห้องนี้แล้ว คุณสามารถเอาห้องนี้ออกจากเมนูของตัวเองได้
                </p>
              </div>
            )}

            <div className={`workspace-card__role ${getRoleStyle(ws.role)}`}>
              <span>{getRoleIcon(ws.role)}</span>
              <span>{ws.roleLabel}</span>
            </div>

            {ws.patientName && (
              <div className="workspace-card__meta">
                <span>🩺</span>
                <span>
                  {ws.patientName}
                  {ws.patientRoom ? ` - ห้อง ${ws.patientRoom}` : ""}
                </span>
              </div>
            )}

            {ws.isDeleted && ws.role !== "owner" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void removeDeletedWorkspace(ws);
                }}
                disabled={removingOrgId === ws.id}
                className="mt-4 w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removingOrgId === ws.id ? "กำลังเอาออก..." : "เอาห้องออกจากเมนูของฉัน"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
