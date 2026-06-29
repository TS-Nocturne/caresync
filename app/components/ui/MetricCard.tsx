interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  status?: "ok" | "warning" | "critical";
  trend?: "up" | "down" | "stable";
  subtitle?: string;
}

const statusColors = {
  ok: "border-status-ok/30 bg-status-ok-bg",
  warning: "border-status-warning/30 bg-status-warning-bg",
  critical: "border-status-critical/30 bg-status-critical-bg",
};

const statusTextColors = {
  ok: "text-status-ok",
  warning: "text-status-warning",
  critical: "text-status-critical",
};

const trendIcons = {
  up: (
    <svg className="w-4 h-4 text-status-critical" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
  ),
  down: (
    <svg className="w-4 h-4 text-status-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
    </svg>
  ),
  stable: (
    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
};

export default function MetricCard({
  label,
  value,
  unit,
  icon,
  status = "ok",
  trend,
  subtitle,
}: MetricCardProps) {
  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 transition-all hover:shadow-md ${statusColors[status]}`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {icon && (
          <div className={`${statusTextColors[status]} opacity-60`}>{icon}</div>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className={`text-xl sm:text-2xl font-bold tabular-nums ${statusTextColors[status]}`}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
        {trend && <span className="ml-auto">{trendIcons[trend]}</span>}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
