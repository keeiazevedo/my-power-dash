import type { AdmData } from "./adm-store";
import type { InsightItem } from "./dashboard-analytics";

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
export type AdmMetric = "uber" | "corridas" | "ticket" | "viagens" | "qtdViagens" | "ticketViagens" | "chamados" | "resolucao";
export type AdmComparison = {
  current: number | null;
  previous: number | null;
  delta: number | null;
  percent: number | null;
};
const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (n: number) => Math.abs(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function admMonths(data: AdmData): string[] {
  const present = new Set([...data.uber, ...data.viagens, ...data.chamados].map(r => r.mes));
  return MONTHS.filter(m => present.has(m));
}

export function compareAdm(current: number | null, previous: number | null): AdmComparison {
  const delta = current === null || previous === null ? null : current - previous;
  return { current, previous, delta, percent: delta === null || previous === null || previous === 0 ? null : delta / Math.abs(previous) * 100 };
}

function monthMetrics(data: AdmData, month: string, segment: string): Record<AdmMetric, number | null> {
  const match = (r: { mes: string; segmento: string }) => r.mes === month && (segment === "TODOS" || r.segmento === segment);
  const uber = data.uber.filter(match);
  const viagens = data.viagens.filter(match);
  // Chamados have no segment field: they always represent the whole department.
  const chamados = data.chamados.filter(r => r.mes === month);
  const cost = uber.reduce((s, r) => s + r.valor, 0);
  const rides = uber.reduce((s, r) => s + r.corridas, 0);
  const trips = viagens.reduce((s, r) => s + (r.quantidade ?? 0), 0);
  const total = chamados.reduce((s, r) => s + r.total, 0);
  return {
    uber: uber.length ? cost : null,
    corridas: uber.length ? rides : null,
    ticket: uber.length && rides > 0 ? cost / rides : null,
    viagens: viagens.length ? viagens.reduce((s, r) => s + r.valor, 0) : null,
    qtdViagens: trips > 0 ? trips : null,
    ticketViagens: trips > 0 ? viagens.reduce((s, r) => s + r.valor, 0) / trips : null,
    chamados: chamados.length ? total : null,
    resolucao: chamados.length && total > 0 ? chamados.reduce((s, r) => s + r.solucionados, 0) / total * 100 : null,
  };
}

export function computeAdmExecutive(data: AdmData, segment: string, month: string) {
  const index = MONTHS.indexOf(month);
  const previousMonth = index > 0 ? MONTHS[index - 1] : null;
  const current = monthMetrics(data, month, segment);
  const previous = monthMetrics(data, previousMonth ?? "", segment);
  const comparisons = Object.fromEntries((Object.keys(current) as AdmMetric[]).map(key => [key, compareAdm(current[key], previous[key])])) as Record<AdmMetric, AdmComparison>;
  const insights: InsightItem[] = [];
  for (const [key, name] of [["uber", "Uber"], ["viagens", "Viagens"]] as const) {
    const c = comparisons[key];
    if (c.delta === null || c.current === null || c.previous === null) {
      insights.push({ id: key, tone: "neutral", title: `${name}: comparação indisponível`, description: `Sem registros para ${c.current === null ? month : previousMonth ?? "o mês anterior"} no recorte selecionado.` });
    } else {
      insights.push({ id: key, tone: c.delta > 0 ? "warning" : c.delta < 0 ? "positive" : "neutral", title: `${name}: ${c.delta > 0 ? "aumento" : c.delta < 0 ? "redução" : "estabilidade"} dos custos`, description: `${money(c.current)} em ${month}; ${c.delta === 0 ? "mesmo valor de" : `${money(Math.abs(c.delta))} ${c.delta > 0 ? "a mais" : "a menos"} que`} ${previousMonth}${c.percent === null ? "." : ` (${pct(c.percent)}%).`}` });
    }
  }

  if (previousMonth) {
    const segments = [...new Set([...data.uber, ...data.viagens].map(r => r.segmento))].filter(s => segment === "TODOS" || s === segment);
    const increases = segments.flatMap(s => {
      const a = monthMetrics(data, month, s), b = monthMetrics(data, previousMonth, s);
      if (a.uber === null || a.viagens === null || b.uber === null || b.viagens === null) return [];
      const delta = a.uber + a.viagens - b.uber - b.viagens;
      return delta > 0 ? [{ segment: s, delta }] : [];
    }).sort((a, b) => b.delta - a.delta);
    const largest = increases[0];
    insights.push(largest
      ? { id: "segmento", tone: "warning", title: `Maior aumento: ${largest.segment}`, description: `${money(largest.delta)} a mais em Uber e viagens, de ${previousMonth} para ${month}, entre segmentos com registros das duas despesas nos dois meses.` }
      : { id: "segmento", tone: "neutral", title: "Custos por segmento", description: "Nenhum aumento combinado identificado entre segmentos com registros de Uber e viagens nos dois meses." });
  }
  const resolution = comparisons.resolucao;
  insights.push(resolution.delta === null || resolution.current === null
    ? { id: "resolucao", tone: "neutral", title: "Resolução: comparação indisponível", description: "Sem base válida de chamados nos dois meses. Indicador geral do Administrativo, sem divisão por segmento." }
    : { id: "resolucao", tone: resolution.delta > 0 ? "positive" : resolution.delta < 0 ? "warning" : "neutral", title: `Resolução ${resolution.delta > 0 ? "avançou" : resolution.delta < 0 ? "recuou" : "estável"}`, description: `${pct(resolution.current)}% em ${month}; ${pct(resolution.delta)} ponto(s) percentual(is) ${resolution.delta > 0 ? "acima" : resolution.delta < 0 ? "abaixo" : "de diferença em relação a"} ${previousMonth}. Todos os segmentos.` });
  return { comparisons, insights, previousMonth };
}