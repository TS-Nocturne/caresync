"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useSession, useActiveOrganization, signOut, organization } from "@/lib/auth-client";
import ThemeToggle from "@/app/components/ui/ThemeToggle";
import { usePortalAccess } from "@/app/hooks/usePortalAccess";
import { useEffect, useState, useRef, useCallback } from "react";

interface WorkspaceMini {
  id: string;
  name: string;
  role: string;
}

export default function Navigation() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string | undefined;
  const { data: session } = useSession();
  const { data: activeOrg } = useActiveOrganization();
  const { access } = usePortalAccess(orgId);

  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceMini[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Fetch all workspaces for the switcher dropdown
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    fetch("/api/me/workspace", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.multipleWorkspaces && data.workspaces) {
          setAllWorkspaces(data.workspaces.map((w: { id: string; name: string; role: string }) => ({
            id: w.id,
            name: w.name,
            role: w.role,
          })));
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [session]);

  // Close switcher on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false);
      }
    }
    if (showSwitcher) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showSwitcher]);

  const handleSwitchWorkspace = useCallback(async (ws: WorkspaceMini) => {
    setShowSwitcher(false);
    try {
      await organization.setActive({ organizationId: ws.id });
    } catch {
      // fallback
    }
    router.push(`/${ws.id}/dashboard`);
  }, [router]);

  const allLinks = orgId
    ? [
        { href: `/${orgId}/dashboard`, label: "Dashboard", icon: "🏠", show: access?.canAccessDashboard },
        { href: `/${orgId}/caregiver`, label: "ผู้ดูแล", icon: "👨‍⚕️", show: access?.canAccessCaregiver },
        { href: `/${orgId}/family`, label: "ครอบครัว", icon: "👨‍👩‍👧‍👦", show: access?.canAccessFamily },
        { href: `/${orgId}/emergency`, label: "ฉุกเฉิน", icon: "🚨", show: access?.canAccessFamily },
        { href: `/${orgId}/settings/team`, label: "ตั้งค่า", icon: "⚙️", show: access?.canManageTeam },
      ]
    : [];

  const links = allLinks.filter((l) => access && l.show);

  return (
    <nav className="fixed top-0 left-0 w-full bg-card/90 backdrop-blur-md border-b border-border z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 flex items-center justify-between gap-3 py-2 sm:py-0">
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          <Link
            href={access?.homePath ?? (orgId ? `/${orgId}/dashboard` : "/dashboard")}
            className="flex min-w-0 items-center gap-2 group"
          >
            <div className="relative h-8 w-8 shrink-0 overflow-hidden flex items-center justify-center">
              <Image src="/logo.png" alt="CareSync Logo" fill className="object-contain" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="font-bold text-base leading-tight text-foreground">CareSync</span>
              <span className="truncate text-[10px] text-muted-foreground max-w-32 sm:max-w-44 md:max-w-56">
                {activeOrg?.name || "Care Workspace"}
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1 bg-muted p-1 rounded-xl">
            {links.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 lg:px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {/* Workspace Switcher */}
          {allWorkspaces.length > 1 && (
            <div className="workspace-switcher" ref={switcherRef}>
              <button
                className="workspace-switcher__trigger"
                onClick={() => setShowSwitcher(!showSwitcher)}
                aria-label="สลับบ้าน"
                id="workspace-switcher-trigger"
              >
                <span>🏠</span>
                <span className="hidden sm:inline">สลับบ้าน</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {showSwitcher && (
                <div className="workspace-switcher__dropdown">
                  {allWorkspaces.map((ws) => (
                    <button
                      key={ws.id}
                      className={`workspace-switcher__item ${ws.id === orgId ? "workspace-switcher__item--active" : ""}`}
                      onClick={() => handleSwitchWorkspace(ws)}
                      id={`workspace-switch-${ws.id}`}
                    >
                      <div className="workspace-switcher__item-icon" style={{ background: ws.id === orgId ? "rgba(255,255,255,0.2)" : "var(--muted)" }}>
                        🏠
                      </div>
                      <div>
                        <div className="workspace-switcher__item-name">{ws.name}</div>
                        <div className="workspace-switcher__item-role">
                          {ws.role === "owner" ? "เจ้าของ" : ws.role === "admin" ? "ผู้ดูแลระบบ" : "พยาบาล/ผู้ดูแล"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="hidden md:flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground leading-none">
                {session?.user?.name || "Loading..."}
              </span>
              <span className="text-xs text-muted-foreground">{access?.roleLabel ?? "..."}</span>
            </div>
          </div>

          <button
            onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
            className="hidden lg:block text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            ออกจากระบบ
          </button>

          <ThemeToggle />
        </div>
      </div>
      {links.length > 0 && (
        <div className="border-t border-border/70 md:hidden">
          <div className="flex gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {links.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span aria-hidden>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
