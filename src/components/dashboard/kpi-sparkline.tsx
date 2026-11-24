import { createContext, useContext } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

export type KpiPoint = { mes: string; valor: number };
export const KpiSeriesContext = createContext<Record<string, KpiPoint[]>>({});

export function KpiSparkline({ label, accent = false }: { label: string; accent?: boolean }) {
  const series = useContext(KpiSeriesContext);
  const points = series[label.split(" • ")[0] ?? label];
  if (!points?.length) return null;
  return <div className="kpi-sparkline mt-3 min-w-0" aria-label={`Evolução mensal: ${label}`}>
    <div className="h-14 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
      <Tooltip labelFormatter={(_, payload) => String(payload[0]?.payload?.mes ?? "")} formatter={(v: number) => [v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }), label]} contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", borderColor: "var(--border)", borderRadius: 6, fontSize: 12 }} />
      <Line dataKey="valor" type="linear" stroke={accent ? "var(--secondary)" : "var(--primary)"} strokeWidth={2} dot={points.length === 1 ? { r: 3 } : false} activeDot={{ r: 4 }} isAnimationActive={false} />
    </LineChart></ResponsiveContainer></div>
    <div className="flex justify-between text-[10px] text-muted-foreground"><span>{points[0]?.mes}</span><span>{points.length > 1 ? points.at(-1)?.mes : ""}</span></div>
  </div>;
}