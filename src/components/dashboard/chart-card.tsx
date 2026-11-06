import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  subtitle,
  badge,
  action,
  heightClass = "h-72",
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: ReactNode;
  heightClass?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm break-inside-avoid", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="border-l-4 border-primary pl-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              {title}
            </h3>
            {badge && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="no-print flex items-center gap-1.5">{action}</div>}
      </div>
      <div className={cn("w-full", heightClass)}>{children}</div>
    </div>
  );
}

type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
};

export function BrandTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
  decimals = 0,
  showTotal = false,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  valueSuffix?: string;
  decimals?: number;
  showTotal?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const numericItems = payload.filter((p) => typeof p.value === "number");
  const total = numericItems.reduce((s, p) => s + Number(p.value ?? 0), 0);

  const fmt = (val: number | string | undefined) => {
    if (typeof val !== "number") return String(val ?? "");
    return (
      val.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) + valueSuffix
    );
  };

  return (
    <div className="min-w-[170px] rounded-lg border bg-white p-2.5 text-xs shadow-lg">
      {label && <div className="mb-1.5 border-b pb-1 font-semibold text-foreground">{label}</div>}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: entry.color || "#007A4D" }}
              />
              <span className="truncate max-w-[140px]">{entry.name}</span>
            </span>
            <span className="font-semibold text-foreground">{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
      {showTotal && numericItems.length > 1 && (
        <div className="mt-1.5 flex items-center justify-between border-t pt-1 font-bold text-foreground">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
      )}
    </div>
  );
}
