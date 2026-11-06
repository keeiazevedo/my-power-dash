import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { TrendInfo } from "@/lib/dashboard-analytics";
import { cn } from "@/lib/utils";

export type KpiCardProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  accent?: string;
  trend?: TrendInfo;
  progressPct?: number;
  scopeBadge?: string;
};

export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = "#007A4D",
  trend,
  progressPct,
  scopeBadge,
}: KpiCardProps) {
  const TrendIcon =
    trend?.direction === "up"
      ? ArrowUpRight
      : trend?.direction === "down"
        ? ArrowDownRight
        : ArrowRight;

  return (
    <div className="kpi-card group relative flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md break-inside-avoid">
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: accent }}>
            {value}
          </div>
          {scopeBadge && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {scopeBadge}
            </span>
          )}
        </div>

        {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}

        {typeof progressPct === "number" && (
          <div className="mt-2.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, progressPct))}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center pt-2 border-t border-border/60">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend.direction === "flat"
                ? "bg-muted text-muted-foreground"
                : trend.isPositive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800",
            )}
          >
            <TrendIcon className="h-3 w-3 shrink-0" />
            {trend.deltaText}
          </span>
        </div>
      )}
    </div>
  );
}
