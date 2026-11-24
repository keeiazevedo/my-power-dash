import type { DashboardData } from "./dashboard-store";
import type { AdmData } from "./adm-store";
import {
  computeExecutiveKpis,
  filterDashboardByPeriodo,
  formatInt,
  formatPct,
  getPeriodoIndices,
  isDashboardEmpty,
  type PeriodoId,
} from "./dashboard-analytics";
import { admMonths, computeAdmExecutive, computeAdmYear } from "./adm-analytics";
import { healthMonthInsights } from "./health-month-insights";

export type PreviewFilters = {
  sector: "SAUDE" | "ADMINISTRATIVO";
  period: PeriodoId;
  segment: string;
  year?: string;
};
export type PreviewMetric = {
  id: string;
  label: string;
  value: number | null;
  kind: "number" | "money" | "percent";
  note: string;
  points: { mes: string; valor: number }[];
};
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const searchMetrics = (metrics: PreviewMetric[], query: string) =>
  metrics.filter((m) => normalizeSearch(m.label).includes(normalizeSearch(query)));
export const formatMetric = (m: Pick<PreviewMetric, "value" | "kind">) =>
  m.value === null
    ? "—"
    : m.kind === "money"
      ? m.value.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        })
      : m.kind === "percent"
        ? formatPct(m.value, 1)
        : formatInt(m.value);

export function previewAnalysis(health: DashboardData, adm: AdmData, filters: PreviewFilters) {
  const { sector, period, segment, year = "2026" } = filters;
  const segments = segment === "TODOS" ? health.segmentos : [segment];
  const available =
    sector === "SAUDE"
      ? isDashboardEmpty(health)
        ? []
        : health.meses.slice(
            0,
            health.meses.indexOf(
              computeExecutiveKpis(
                health,
                filterDashboardByPeriodo(health, "ANO", health.segmentos),
                "ANO",
                "TODOS",
                health.segmentos,
              ).refMesAtual,
            ) + 1,
          )
      : admMonths(adm);
  const calendar =
    sector === "SAUDE"
      ? health.meses
      : ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const months = getPeriodoIndices(calendar, period)
    .map((i) => calendar[i])
    .filter((m): m is string => typeof m === "string" && available.includes(m));
  const scope = segment === "TODOS" ? "Todos os segmentos" : segment;
  const context = `${sector === "SAUDE" ? "Saúde" : "Administrativo"} · ${year} · ${months[0] ?? "—"}–${months.at(-1) ?? "—"} · ${scope}`;
  const points = (get: (m: string) => number) => months.map((mes) => ({ mes, valor: get(mes) }));
  const metrics: PreviewMetric[] = [];
  const paragraphs: string[] = [];
  const metric = (
    id: string,
    label: string,
    value: number | null,
    kind: PreviewMetric["kind"],
    note: string,
    series: PreviewMetric["points"],
  ) => {
    const result = { id, label, value, kind, note, points: series };
    metrics.push(result);
    return formatMetric(result);
  };
  const month = months.at(-1);
  if (!month) return { metrics, paragraphs, context, months, empty: true };
  if (sector === "SAUDE") {
    // Clip unfilled trailing months for descriptive reports only; source data is never changed.
    const filtered = filterDashboardByPeriodo(health, period, segments);
    const clip = <T extends Record<string, string | number>>(rows: T[]) =>
      rows.filter((r) => months.includes(String(r["mes"])));
    filtered.asoPeriodicoPrevReal = clip(filtered.asoPeriodicoPrevReal);
    filtered.catPorMes = clip(filtered.catPorMes);
    filtered.atendimentosEnfermagem = clip(filtered.atendimentosEnfermagem);
    filtered.atendimentosMerp = clip(filtered.atendimentosMerp);
    filtered.atestadoMedico = clip(filtered.atestadoMedico);
    filtered.taxaAbsenteismo = clip(filtered.taxaAbsenteismo);
    filtered.afastamentoInss = clip(filtered.afastamentoInss);
    filtered.afastamentoStatus = clip(filtered.afastamentoStatus);
    filtered.limboPrevidenciario = clip(filtered.limboPrevidenciario);
    filtered.qualidadeVida = clip(filtered.qualidadeVida);
    filtered.recomendacaoNaoContratacao = clip(filtered.recomendacaoNaoContratacao);
    filtered.indices = filtered.indices.filter((i) => months.includes(health.meses[i] ?? ""));
    filtered.mediaCatMensal =
      filtered.catPorMes.reduce((s, r) => s + r.quantidade, 0) / months.length;
    const sumRow = (row: Record<string, string | number> | undefined) =>
      segments.reduce((s, seg) => s + Number(row?.[seg] ?? 0), 0);
    filtered.mediaAbsenteismo =
      filtered.taxaAbsenteismo.reduce((s, r) => s + sumRow(r) / Math.max(1, segments.length), 0) /
      Math.max(1, filtered.taxaAbsenteismo.length);
    const kpi = computeExecutiveKpis(health, filtered, period, segment, segments);
    const aso = metric(
      "aso",
      "ASO periódicos realizados",
      kpi.asoRealizado,
      "number",
      "Consolidado da empresa",
      points((m) => health.asoPeriodicoPrevReal.find((r) => r.mes === m)?.REALIZADOS ?? 0),
    );
    metric(
      "cat",
      "Total de CAT",
      kpi.totalCat,
      "number",
      kpi.catIsSegmentExact ? scope : "Consolidado da empresa · sem divisão mensal por segmento",
      kpi.catIsSegmentExact
        ? []
        : points((m) => health.catPorMes.find((r) => r.mes === m)?.quantidade ?? 0),
    );
    const atestados = metric(
      "atestados",
      "Atestados médicos",
      kpi.totalAtestados,
      "number",
      scope,
      points((m) => sumRow(health.atestadoMedico.find((r) => r["mes"] === m))),
    );
    const abs = metric(
      "absenteismo",
      "Taxa média de absenteísmo",
      kpi.absenteismoMedio,
      "percent",
      `${scope} · média simples das taxas`,
      points(
        (m) =>
          sumRow(health.taxaAbsenteismo.find((r) => r["mes"] === m)) / Math.max(1, segments.length),
      ),
    );
    metric(
      "limbo",
      "Casos em limbo",
      kpi.limboAtual,
      "number",
      `Último mês com dados: ${kpi.limboMesFinal} · ${scope}`,
      points((m) => sumRow(health.limboPrevidenciario.find((r) => r["mes"] === m))).filter(
        (r) => calendar.indexOf(r.mes) <= calendar.indexOf(kpi.limboMesFinal),
      ),
    );
    metric(
      "atendimento",
      "Atendimentos de saúde",
      kpi.totalEnfermagem + kpi.totalMerp,
      "number",
      "Enfermagem + MERP · consolidado da empresa",
      points(
        (m) =>
          (health.atendimentosEnfermagem.find((r) => r.mes === m)?.TOTAL ?? 0) +
          (health.atendimentosMerp.find((r) => r.mes === m)?.quantidade ?? 0),
      ),
    );
    for (const [id, label, rows] of [
      ["testes", "Testes Álcool e Drogas", health.testesAlcoolDrogas],
      ["social", "Atendimentos Sociais", health.atendimentosSociais],
    ] as const) {
      const annualOnly = (rows ?? []).some((r) => !calendar.includes(r.mes));
      const value = annualOnly
        ? period === "ANO"
          ? (rows ?? []).reduce((s, r) => s + r.quantidade, 0)
          : null
        : (rows ?? []).filter((r) => months.includes(r.mes)).reduce((s, r) => s + r.quantidade, 0);
      metric(
        id,
        label,
        value,
        "number",
        annualOnly ? "Total anual · sem divisão mensal ou por segmento" : "Consolidado da empresa",
        annualOnly ? [] : points((m) => rows?.find((r) => r.mes === m)?.quantidade ?? 0),
      );
    }
    paragraphs.push(
      `No período selecionado, foram realizados ${aso} ASO periódicos, com adesão de ${formatPct(kpi.asoTaxaPct, 1)} em relação aos exames previstos. Os ASO e os atendimentos de saúde são consolidados da empresa e não possuem divisão por segmento nesta base.`,
    );
    paragraphs.push(
      `Para ${scope}, foram registrados ${atestados} atestados médicos. A taxa média simples de absenteísmo foi de ${abs}. A posição de limbo é de ${formatInt(kpi.limboAtual)} casos em ${kpi.limboMesFinal}; o pico no período foi de ${formatInt(kpi.limboPico)} casos${kpi.limboPicoMes ? ` em ${kpi.limboPicoMes}` : ""}.`,
    );
    const peak = filtered.taxaAbsenteismo
      .flatMap((r) =>
        segments.map((s) => ({ segment: s, month: String(r["mes"]), value: Number(r[s] ?? 0) })),
      )
      .sort((a, b) => b.value - a.value)[0];
    if (peak && peak.value > 0)
      paragraphs.push(
        `O maior registro de absenteísmo foi ${formatPct(peak.value)} em ${peak.segment}, no mês de ${peak.month}. Esse resultado descreve a base disponível; não constitui desvio de uma meta oficial nem identifica sua causa.`,
      );
    const previous = calendar[calendar.indexOf(month) - 1];
    const comparisonIds = new Set<string>();
    const pair = [month, previous];
    if (health.asoPeriodicoPrevReal.some((r) => pair.includes(r.mes) && r.REALIZADOS > 0))
      comparisonIds.add("aso-mensal");
    if (health.taxaAbsenteismo.some((r) => pair.includes(String(r["mes"])) && sumRow(r) > 0))
      comparisonIds.add("abs-mensal");
    if (health.atestadoMedico.some((r) => pair.includes(String(r["mes"])) && sumRow(r) > 0))
      comparisonIds.add("atestados-mensal");
    if (health.catPorMes.some((r) => pair.includes(r.mes) && r.quantidade > 0))
      comparisonIds.add("cat-mensal");
    const comparisons = healthMonthInsights(health, month, segments).filter(
      (i) => comparisonIds.has(i.id) || i.id === "sem-anterior",
    );
    paragraphs.push(
      `A comparação do último mês selecionado com o mês imediatamente anterior utiliza a base completa: ${comparisons.map((i) => `${i.title}. ${i.description}`).join(" ") || "Não há registros preenchidos suficientes para uma comparação."} Valores zerados na planilha podem representar meses não preenchidos e precisam de validação; não confirmam ausência de ocorrências.`,
    );
  } else {
    const matches = (r: { mes: string; segmento: string }) =>
      months.includes(r.mes) && (segment === "TODOS" || r.segmento === segment);
    const scoped: AdmData = {
      uber: adm.uber.filter(matches),
      viagens: adm.viagens.filter((r) => months.includes(r.mes) && (segment === "TODOS" || r.segmento === segment || r.segmento === "GERAL")),
      chamados: adm.chamados.filter((r) => months.includes(r.mes)),
      quantidadeViagensTotal:
        period === "ANO" && segment === "TODOS" ? adm.quantidadeViagensTotal : null,
    };
    const sum = (rows: { valor: number }[]) => rows.reduce((s, r) => s + r.valor, 0);
    const calls = scoped.chamados.reduce((s, r) => s + r.total, 0),
      solved = scoped.chamados.reduce((s, r) => s + r.solucionados, 0);
    const rides = scoped.uber.reduce((s, r) => s + r.corridas, 0);
    const details = scoped.viagens.reduce((s, r) => s + (r.quantidade ?? 0), 0);
    const quantity = scoped.quantidadeViagensTotal ?? (details > 0 ? details : null);
    metric(
      "chamados",
      "Chamados Administrativos",
      calls,
      "number",
      "Consolidado do setor · sem divisão por segmento",
      points((m) => scoped.chamados.filter((r) => r.mes === m).reduce((s, r) => s + r.total, 0)),
    );
    const resolution = metric(
      "resolucao",
      "Taxa de resolução",
      calls ? (solved / calls) * 100 : null,
      "percent",
      "Consolidado do setor · sem divisão por segmento",
      points((m) => {
        const rows = scoped.chamados.filter((r) => r.mes === m);
        const t = rows.reduce((s, r) => s + r.total, 0);
        return t ? (rows.reduce((s, r) => s + r.solucionados, 0) / t) * 100 : 0;
      }),
    );
    const uber = metric(
      "uber",
      "Custo Uber",
      scoped.uber.length ? sum(scoped.uber) : null,
      "money",
      scope,
      points((m) => sum(scoped.uber.filter((r) => r.mes === m))),
    );
    metric(
      "corridas",
      "Corridas Uber",
      scoped.uber.length ? rides : null,
      "number",
      scope,
      points((m) => scoped.uber.filter((r) => r.mes === m).reduce((s, r) => s + r.corridas, 0)),
    );
    metric(
      "ticket-uber",
      "Ticket médio Uber",
      rides ? sum(scoped.uber) / rides : null,
      "money",
      "Custo por corrida",
      points((m) => {
        const rows = scoped.uber.filter((r) => r.mes === m);
        const n = rows.reduce((s, r) => s + r.corridas, 0);
        return n ? sum(rows) / n : 0;
      }),
    );
    const travel = metric(
      "viagens",
      "Custo Viagens",
      scoped.viagens.length ? sum(scoped.viagens) : null,
      "money",
      scope,
      points((m) => sum(scoped.viagens.filter((r) => r.mes === m))),
    );
    metric(
      "quantidade-viagens",
      "Quantidade de Viagens",
      quantity,
      "number",
      scoped.quantidadeViagensTotal !== null
        ? "Total anual · sem divisão por mês ou segmento"
        : "Detalhamento disponível na base",
      [],
    );
    metric(
      "ticket-viagens",
      "Ticket médio Viagens",
      quantity ? sum(scoped.viagens) / quantity : null,
      "money",
      "Custo por viagem · conforme quantidade disponível",
      [],
    );
    paragraphs.push(
      `Os custos registrados para ${scope} foram de ${uber} em Uber e ${travel} em viagens. O custo não permite, isoladamente, concluir sobre eficiência, economia ou causas das variações.`,
    );
    paragraphs.push(
      `O Administrativo recebeu ${formatInt(calls)} chamados e solucionou ${formatInt(solved)}, com taxa de resolução de ${resolution}. Esses números representam todo o setor, independentemente do segmento selecionado.`,
    );
    if (months.length > 1)
      paragraphs.push(
        computeAdmYear(scoped, segment)
          .insights.filter((i) => ["pico", "seg-top", "tendencia"].includes(i.id))
          .map((i) => `${i.title}. ${i.description}`)
          .join(" "),
      );
    paragraphs.push(
      `Comparação de ${month} com o mês imediatamente anterior, usando a base completa: ${computeAdmExecutive(
        adm,
        segment,
        month,
      )
        .insights.map(
          (i) =>
            `${i.title}. ${i.description.replace("no recorte selecionado", "no período selecionado")}`,
        )
        .join(" ")}`,
    );
    if (quantity === null)
      paragraphs.push(
        "A quantidade e o ticket médio de viagens não estão disponíveis para este período e segmento. O total anual não foi distribuído artificialmente.",
      );
  }
  return { metrics, paragraphs: paragraphs.filter(Boolean), context, months, empty: false };
}
