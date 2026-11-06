import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info, Sparkles } from "lucide-react";
import type { InsightItem } from "@/lib/dashboard-analytics";
import { cn } from "@/lib/utils";

export function InsightsPanel({
  insights,
  periodoLabel,
}: {
  insights: InsightItem[];
  periodoLabel: string;
}) {
  const [open, setOpen] = useState(true);

  if (insights.length === 0) return null;

  return (
    <section className="rounded-xl border bg-card shadow-sm break-inside-avoid">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Destaques Executivos • {periodoLabel}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Leitura automática dos principais pontos de atenção e evolução mensal
            </p>
          </div>
        </div>
        <span className="no-print inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          {open ? (
            <>
              Recolher <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Expandir <ChevronDown className="h-4 w-4" />
            </>
          )}
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-3 border-t px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {insights.map((item) => {
            const Icon =
              item.tone === "positive"
                ? CheckCircle2
                : item.tone === "warning"
                  ? AlertTriangle
                  : Info;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  item.tone === "positive" && "border-emerald-200/80 bg-emerald-50/50",
                  item.tone === "warning" && "border-amber-200/80 bg-amber-50/50",
                  item.tone === "neutral" && "border-border bg-muted/30",
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      item.tone === "positive" && "text-emerald-700",
                      item.tone === "warning" && "text-amber-600",
                      item.tone === "neutral" && "text-primary",
                    )}
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{item.title}</div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
