"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { organization } from "@/lib/auth-client";

export interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
  homePath: string;
  patientName: string | null;
  patientRoom: string | null;
}

interface WorkspaceSelectorProps {
  workspaces: WorkspaceInfo[];
  userName?: string;
}

function getRoleStyle(role: string) {
  switch (role) {
    case "owner":
      return "workspace-card__role--owner";
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

  const handleSelect = async (ws: WorkspaceInfo) => {
    try {
      // Set active organization via Better Auth
      await organization.setActive({ organizationId: ws.id });
    } catch {
      // If Better Auth org plugin isn't available, just navigate
    }
    router.push(ws.homePath);
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
          เลือกบ้านที่คุณต้องการเข้าทำงานวันนี้
        </p>
      </div>

      <div className="workspace-selector__grid">
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className="workspace-card"
            onClick={() => handleSelect(ws)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelect(ws); }}
            id={`workspace-card-${ws.id}`}
          >
            {/* Arrow icon */}
            <svg className="workspace-card__arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>

            {/* Icon */}
            <div className="workspace-card__icon">
              🏠
            </div>

            {/* Name */}
            <h3 className="workspace-card__name">{ws.name}</h3>

            {/* Role badge */}
            <div className={`workspace-card__role ${getRoleStyle(ws.role)}`}>
              <span>{getRoleIcon(ws.role)}</span>
              <span>{ws.roleLabel}</span>
            </div>

            {/* Patient info */}
            {ws.patientName && (
              <div className="workspace-card__meta">
                <span>🩺</span>
                <span>
                  {ws.patientName}
                  {ws.patientRoom ? ` — ห้อง ${ws.patientRoom}` : ""}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
