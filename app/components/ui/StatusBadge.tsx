interface StatusBadgeProps {
  status: "ok" | "warning" | "critical" | "disabled";
  label?: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const statusConfig = {
  ok: {
    bg: "bg-status-ok-bg",
    text: "text-status-ok",
    dot: "bg-status-ok",
    label: "ปกติ",
    shadow: "shadow-[0_0_8px_rgba(34,197,94,0.3)]",
  },
  warning: {
    bg: "bg-status-warning-bg",
    text: "text-status-warning",
    dot: "bg-status-warning",
    label: "เฝ้าระวัง",
    shadow: "shadow-[0_0_8px_rgba(245,158,11,0.3)]",
  },
  critical: {
    bg: "bg-status-critical-bg",
    text: "text-status-critical",
    dot: "bg-status-critical",
    label: "ตรวจสอบด่วน",
    shadow: "shadow-[0_0_8px_rgba(239,68,68,0.3)]",
  },
  disabled: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    label: "AI Disabled",
    shadow: "shadow-none",
  },
};

const sizeConfig = {
  sm: "px-2 py-0.5 text-xs gap-1.5",
  md: "px-3 py-1 text-sm gap-2",
  lg: "px-4 py-1.5 text-base gap-2",
};

const dotSize = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export default function StatusBadge({
  status,
  label,
  size = "md",
  pulse = false,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeConfig[size]}`}
    >
      <span className="relative flex">
        <span
          className={`${dotSize[size]} rounded-full ${config.dot} ${config.shadow}`}
        />
        {(pulse || status === "critical") && (
          <span
            className={`absolute inset-0 rounded-full ${config.dot} animate-ping opacity-40`}
          />
        )}
      </span>
      {label || config.label}
    </span>
  );
}
