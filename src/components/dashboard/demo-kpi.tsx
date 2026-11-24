import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type DemoPoint = { mes: string; valor: number };
export type DemoMetric = {
  label: string;
  value: string;
  note: string;
  points: DemoPoint[];
  icon: LucideIcon;
  accent?: boolean;
  children?: ReactNode;
};

export function DemoKpi({ label, value, note, points, icon: Icon, accent, children }: DemoMetric) {
  const color = accent ? "var(--secondary)" : "var(--primary)";
  return (
    <article className="demo-kpi min-w-0 overflow-hidden rounded-lg border bg-card text-card-foreground">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <h3 className="min-h-8 text-xs font-semibold uppercase leading-4 text-muted-foreground">{label}</h3>
        <Icon className={accent ? "size-5 shrink-0 text-secondary" : "size-5 shrink-0 text-primary"} />
      </div>
      <div className="px-5">
        <p className="demo-kpi-value break-words text-3xl font-semibold tabular-nums leading-tight">{value}</p>
        <p className="mt-2 min-h-8 text-xs leading-4 text-muted-foreground">{note}</p>
      </div>
      <div className="mt-3 h-16 w-full px-3" aria-label={`Evolução mensal: ${label}`}>
        {points.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Tooltip labelFormatter={(_, payload) => String(payload[0]?.payload?.mes ?? "")} formatter={(v: number) => [v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }), label]} contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", borderColor: "var(--border)", borderRadius: 6 }} />
              <Line dataKey="valor" type="linear" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="flex h-full items-center border-t text-xs text-muted-foreground">Total anual · sem detalhamento mensal</div>}
      </div>
      {points.length > 0 && <div className="flex justify-between px-5 pb-3 text-[10px] text-muted-foreground"><span>{points[0]?.mes}</span><span>{points.at(-1)?.mes}</span></div>}
      {children && <div className="border-t px-5 py-3">{children}</div>}
    </article>
  );
}