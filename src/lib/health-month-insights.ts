import type { DashboardData } from "./dashboard-store";
import { formatInt, formatPct, type InsightItem } from "./dashboard-analytics";

/** Comparações descritivas, sem estabelecer metas ou alterar os dados do painel. */
export function healthMonthInsights(data: DashboardData, month: string, segments: string[]): InsightItem[] {
  const index = data.meses.indexOf(month);
  const previous = index > 0 ? data.meses[index - 1] : undefined;
  if (!previous) return [{ id: "sem-anterior", tone: "neutral", title: "Sem mês anterior para comparar", description: `${month} é o primeiro mês disponível nesta base.` }];
  const sumSegments = (rows: Record<string, string | number>[], mes: string) => {
    const row = rows.find(r => r["mes"] === mes);
    return segments.reduce((sum, s) => sum + Number(row?.[s] ?? 0), 0);
  };
  const comparison = (id: string, title: string, current: number, before: number, suffix: string, scope: string, percentage = false): InsightItem => {
    const delta = current - before;
    const fmt = percentage ? formatPct : formatInt;
    const difference = percentage
      ? `${delta > 0 ? "+" : ""}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} p.p.`
      : before > 0 ? `${delta > 0 ? "+" : ""}${formatPct(delta / before * 100, 1)}` : `${delta > 0 ? "+" : ""}${formatInt(delta)} ${suffix}`;
    return { id, tone: "neutral", title: `${title}: ${delta === 0 ? "estável" : difference}`, description: `${fmt(before)} (${previous}) → ${fmt(current)} (${month})${suffix && !percentage ? ` ${suffix}` : ""}. ${scope}` };
  };
  const segmentScope = segments.length === data.segmentos.length ? "Todos os segmentos." : `Segmento: ${segments.join(", ")}.`;
  const abs = (mes: string) => segments.length ? sumSegments(data.taxaAbsenteismo, mes) / segments.length : 0;
  return [
    comparison("aso-mensal", "ASO realizados", data.asoPeriodicoPrevReal.find(r => r.mes === month)?.REALIZADOS ?? 0, data.asoPeriodicoPrevReal.find(r => r.mes === previous)?.REALIZADOS ?? 0, "exames", "Consolidado da empresa."),
    comparison("abs-mensal", "Absenteísmo", abs(month), abs(previous), "", segmentScope, true),
    comparison("atestados-mensal", "Atestados", sumSegments(data.atestadoMedico, month), sumSegments(data.atestadoMedico, previous), "atestados", segmentScope),
    comparison("cat-mensal", "CAT", data.catPorMes.find(r => r.mes === month)?.quantidade ?? 0, data.catPorMes.find(r => r.mes === previous)?.quantidade ?? 0, "ocorrências", "Consolidado da empresa, sem divisão mensal por segmento."),
  ];
}