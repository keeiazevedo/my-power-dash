import type { DashboardData } from "./dashboard-store";

export type PeriodoId =
  | "ANO"
  | "S1"
  | "S2"
  | "T1"
  | "T2"
  | "T3"
  | "T4"
  | `M:${string}`;

export type PeriodoOption = {
  id: PeriodoId;
  label: string;
  shortLabel: string;
  group: "visao" | "semestre" | "trimestre" | "mes";
};

export function getPeriodoOptions(meses: string[]): PeriodoOption[] {
  const base: PeriodoOption[] = [
    { id: "ANO", label: "Ano Completo", shortLabel: "Ano Completo", group: "visao" },
    { id: "S1", label: "1º Semestre (Jan–Jun)", shortLabel: "1º Semestre", group: "semestre" },
    { id: "S2", label: "2º Semestre (Jul–Dez)", shortLabel: "2º Semestre", group: "semestre" },
    { id: "T1", label: "1º Trimestre (Jan–Mar)", shortLabel: "1º Trimestre", group: "trimestre" },
    { id: "T2", label: "2º Trimestre (Abr–Jun)", shortLabel: "2º Trimestre", group: "trimestre" },
    { id: "T3", label: "3º Trimestre (Jul–Set)", shortLabel: "3º Trimestre", group: "trimestre" },
    { id: "T4", label: "4º Trimestre (Out–Dez)", shortLabel: "4º Trimestre", group: "trimestre" },
  ];

  const monthOpts: PeriodoOption[] = meses.map((m) => ({
    id: `M:${m}`,
    label: `Mês: ${m}`,
    shortLabel: m,
    group: "mes",
  }));

  return [...base, ...monthOpts];
}

export function getPeriodoIndices(meses: string[], periodo: PeriodoId): number[] {
  const all = meses.map((_, i) => i);
  if (periodo === "ANO") return all;
  if (periodo === "S1") return all.filter((i) => i >= 0 && i <= 5);
  if (periodo === "S2") return all.filter((i) => i >= 6 && i <= 11);
  if (periodo === "T1") return all.filter((i) => i >= 0 && i <= 2);
  if (periodo === "T2") return all.filter((i) => i >= 3 && i <= 5);
  if (periodo === "T3") return all.filter((i) => i >= 6 && i <= 8);
  if (periodo === "T4") return all.filter((i) => i >= 9 && i <= 11);
  if (periodo.startsWith("M:")) {
    const target = periodo.slice(2);
    const idx = meses.indexOf(target);
    return idx >= 0 ? [idx] : all;
  }
  return all;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

export function formatPct(n: number, decimals = 2): string {
  return `${n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function isDashboardEmpty(data: DashboardData): boolean {
  const sumAso = data.asoPeriodicoPrevReal.reduce((s, r) => s + r.PREVISTOS + r.REALIZADOS, 0);
  const sumCat = data.catPorMes.reduce((s, r) => s + r.quantidade, 0);
  const sumEnf = data.atendimentosEnfermagem.reduce((s, r) => s + r.TOTAL, 0);
  const sumMerp = data.atendimentosMerp.reduce((s, r) => s + r.quantidade, 0);
  const sumAtest = data.atestadoMedico.reduce(
    (s, r) =>
      s +
      Object.entries(r).reduce((acc, [k, v]) => (k === "mes" ? acc : acc + Number(v || 0)), 0),
    0,
  );
  return sumAso + sumCat + sumEnf + sumMerp + sumAtest === 0;
}

export type TrendInfo = {
  deltaText: string;
  direction: "up" | "down" | "flat";
  isPositive: boolean;
};

function sumRowSegments(row: Record<string, string | number> | undefined, segList: string[]): number {
  if (!row) return 0;
  return segList.reduce((acc, s) => acc + Number(row[s] ?? 0), 0);
}

function avgRowSegments(row: Record<string, string | number> | undefined, segList: string[]): number {
  if (!row || segList.length === 0) return 0;
  return sumRowSegments(row, segList) / segList.length;
}

/**
 * Finds the latest month index inside `indices` that has actual dashboard data,
 * so partial-year spreadsheets compare the latest filled month instead of trailing zeros.
 */
function findLatestActiveMonthIndex(data: DashboardData, indices: number[]): number {
  for (let p = indices.length - 1; p >= 0; p--) {
    const idx = indices[p];
    const hasActivity =
      (data.asoPeriodicoPrevReal[idx]?.REALIZADOS ?? 0) > 0 ||
      (data.catPorMes[idx]?.quantidade ?? 0) > 0 ||
      (data.atendimentosEnfermagem[idx]?.TOTAL ?? 0) > 0 ||
      sumRowSegments(data.atestadoMedico[idx], data.segmentos) > 0;
    if (hasActivity) return idx;
  }
  return indices[indices.length - 1] ?? 0;
}

function makePercentTrend(
  curr: number,
  prev: number,
  prevMonthName: string,
  lowerIsBetter: boolean,
): TrendInfo | undefined {
  if (!prevMonthName) return undefined;
  if (prev === 0 && curr === 0) {
    return { deltaText: `Estável vs ${prevMonthName}`, direction: "flat", isPositive: true };
  }
  if (prev === 0) {
    return {
      deltaText: `+${formatInt(curr)} vs ${prevMonthName}`,
      direction: "up",
      isPositive: !lowerIsBetter,
    };
  }
  const diffPct = ((curr - prev) / prev) * 100;
  if (Math.abs(diffPct) < 0.5) {
    return { deltaText: `Estável vs ${prevMonthName}`, direction: "flat", isPositive: true };
  }
  const sign = diffPct > 0 ? "+" : "";
  const formatted = `${sign}${diffPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs ${prevMonthName}`;
  const direction = diffPct > 0 ? "up" : "down";
  const isPositive = lowerIsBetter ? diffPct < 0 : diffPct > 0;
  return { deltaText: formatted, direction, isPositive };
}

function makePointsTrend(
  curr: number,
  prev: number,
  prevMonthName: string,
  lowerIsBetter: boolean,
): TrendInfo | undefined {
  if (!prevMonthName) return undefined;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.02) {
    return { deltaText: `Estável vs ${prevMonthName}`, direction: "flat", isPositive: true };
  }
  const sign = diff > 0 ? "+" : "";
  const formatted = `${sign}${diff.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} p.p. vs ${prevMonthName}`;
  const direction = diff > 0 ? "up" : "down";
  const isPositive = lowerIsBetter ? diff < 0 : diff > 0;
  return { deltaText: formatted, direction, isPositive };
}

export type FilteredDashboard = {
  indices: number[];
  asoPeriodicoPrevReal: DashboardData["asoPeriodicoPrevReal"];
  recomendacaoNaoContratacao: DashboardData["recomendacaoNaoContratacao"];
  catPorMes: DashboardData["catPorMes"];
  atendimentosEnfermagem: DashboardData["atendimentosEnfermagem"];
  atendimentosMerp: DashboardData["atendimentosMerp"];
  atestadoMedico: DashboardData["atestadoMedico"];
  taxaAbsenteismo: DashboardData["taxaAbsenteismo"];
  afastamentoInss: DashboardData["afastamentoInss"];
  afastamentoStatus: DashboardData["afastamentoStatus"];
  limboPrevidenciario: DashboardData["limboPrevidenciario"];
  qualidadeVida: DashboardData["qualidadeVida"];
  mediaCatMensal: number;
  mediaAbsenteismo: number;
};

export function filterDashboardByPeriodo(
  data: DashboardData,
  periodo: PeriodoId,
  segList: string[],
): FilteredDashboard {
  const indices = getPeriodoIndices(data.meses, periodo);
  const pick = <T,>(arr: T[]) => indices.map((i) => arr[i]).filter((x): x is T => x !== undefined);

  const catPorMes = pick(data.catPorMes);
  const taxaAbsenteismo = pick(data.taxaAbsenteismo);

  const mediaCatMensal =
    catPorMes.length > 0
      ? catPorMes.reduce((s, r) => s + r.quantidade, 0) / catPorMes.length
      : 0;

  const mediaAbsenteismo =
    taxaAbsenteismo.length > 0
      ? taxaAbsenteismo.reduce((s, r) => s + avgRowSegments(r, segList), 0) /
        taxaAbsenteismo.length
      : 0;

  return {
    indices,
    asoPeriodicoPrevReal: pick(data.asoPeriodicoPrevReal),
    recomendacaoNaoContratacao: pick(data.recomendacaoNaoContratacao),
    catPorMes,
    atendimentosEnfermagem: pick(data.atendimentosEnfermagem),
    atendimentosMerp: pick(data.atendimentosMerp),
    atestadoMedico: pick(data.atestadoMedico),
    taxaAbsenteismo,
    afastamentoInss: pick(data.afastamentoInss),
    afastamentoStatus: pick(data.afastamentoStatus),
    limboPrevidenciario: pick(data.limboPrevidenciario),
    qualidadeVida: pick(data.qualidadeVida),
    mediaCatMensal,
    mediaAbsenteismo,
  };
}

export type ExecutiveKpis = {
  refMesAtual: string;
  asoRealizado: number;
  asoPrevisto: number;
  asoTaxaPct: number;
  asoTrend?: TrendInfo;
  totalCat: number;
  catIsSegmentExact: boolean;
  catSublabel: string;
  catTrend?: TrendInfo;
  absenteismoMedio: number;
  absenteismoTrend?: TrendInfo;
  totalAtestados: number;
  atestadosTrend?: TrendInfo;
  totalAfastInss: number;
  inssTrend?: TrendInfo;
  limboAtual: number;
  limboInicial: number;
  limboMesFinal: string;
  limboTrend?: TrendInfo;
  totalEnfermagem: number;
  enfermagemNoturnoPct: number;
  enfermagemTrend?: TrendInfo;
  totalMerp: number;
  merpTrend?: TrendInfo;
  totalNaoContratacao: number;
  naoContrTrend?: TrendInfo;
  qvPrevista: number;
  qvRealizada: number;
  qvTaxaPct: number;
};

export function computeExecutiveKpis(
  data: DashboardData,
  filtered: FilteredDashboard,
  periodo: PeriodoId,
  segAtivo: string,
  segList: string[],
): ExecutiveKpis {
  const activeIdx = findLatestActiveMonthIndex(data, filtered.indices);
  const prevIdx = activeIdx > 0 ? activeIdx - 1 : -1;
  const refMesAtual = data.meses[activeIdx] ?? "";
  const prevMesName = prevIdx >= 0 ? (data.meses[prevIdx] ?? "") : "";

  const asoPrevisto = filtered.asoPeriodicoPrevReal.reduce((s, r) => s + r.PREVISTOS, 0);
  const asoRealizado = filtered.asoPeriodicoPrevReal.reduce((s, r) => s + r.REALIZADOS, 0);
  const asoTaxaPct = asoPrevisto > 0 ? (asoRealizado / asoPrevisto) * 100 : 0;
  const asoTrend =
    prevIdx >= 0
      ? makePercentTrend(
          data.asoPeriodicoPrevReal[activeIdx]?.REALIZADOS ?? 0,
          data.asoPeriodicoPrevReal[prevIdx]?.REALIZADOS ?? 0,
          prevMesName,
          false,
        )
      : undefined;

  // CAT: if full year and a specific segment is selected, catPorSegmento has exact segment total
  const catIsSegmentExact = periodo === "ANO" && segAtivo !== "TODOS";
  const totalCat = catIsSegmentExact
    ? data.catPorSegmento
        .filter((r) => r.segmento === segAtivo)
        .reduce((s, r) => s + r.quantidade, 0)
    : filtered.catPorMes.reduce((s, r) => s + r.quantidade, 0);

  const catSublabel = catIsSegmentExact
    ? `Segmento ${segAtivo} no ano`
    : `Média: ${filtered.mediaCatMensal.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/mês`;

  const catTrend =
    !catIsSegmentExact && prevIdx >= 0
      ? makePercentTrend(
          data.catPorMes[activeIdx]?.quantidade ?? 0,
          data.catPorMes[prevIdx]?.quantidade ?? 0,
          prevMesName,
          true,
        )
      : undefined;

  const absenteismoMedio = filtered.mediaAbsenteismo;
  const absenteismoTrend =
    prevIdx >= 0
      ? makePointsTrend(
          avgRowSegments(data.taxaAbsenteismo[activeIdx], segList),
          avgRowSegments(data.taxaAbsenteismo[prevIdx], segList),
          prevMesName,
          true,
        )
      : undefined;

  const totalAtestados = filtered.atestadoMedico.reduce(
    (s, r) => s + sumRowSegments(r, segList),
    0,
  );
  const atestadosTrend =
    prevIdx >= 0
      ? makePercentTrend(
          sumRowSegments(data.atestadoMedico[activeIdx], segList),
          sumRowSegments(data.atestadoMedico[prevIdx], segList),
          prevMesName,
          true,
        )
      : undefined;

  const totalAfastInss = filtered.afastamentoInss.reduce(
    (s, r) => s + sumRowSegments(r, segList),
    0,
  );
  const inssTrend =
    prevIdx >= 0
      ? makePercentTrend(
          sumRowSegments(data.afastamentoInss[activeIdx], segList),
          sumRowSegments(data.afastamentoInss[prevIdx], segList),
          prevMesName,
          true,
        )
      : undefined;

  const firstIdx = filtered.indices[0] ?? 0;
  const limboInicial = sumRowSegments(data.limboPrevidenciario[firstIdx], segList);
  const limboAtual = sumRowSegments(data.limboPrevidenciario[activeIdx], segList);
  const limboMesFinal = refMesAtual;
  const limboTrend =
    activeIdx !== firstIdx
      ? makePercentTrend(limboAtual, limboInicial, data.meses[firstIdx] ?? "", true)
      : prevIdx >= 0
        ? makePercentTrend(
            limboAtual,
            sumRowSegments(data.limboPrevidenciario[prevIdx], segList),
            prevMesName,
            true,
          )
        : undefined;

  const totalEnfermagem = filtered.atendimentosEnfermagem.reduce((s, r) => s + r.TOTAL, 0);
  const totalEnfNoturno = filtered.atendimentosEnfermagem.reduce((s, r) => s + r.NOTURNO, 0);
  const enfermagemNoturnoPct = totalEnfermagem > 0 ? (totalEnfNoturno / totalEnfermagem) * 100 : 0;
  const enfermagemTrend =
    prevIdx >= 0
      ? makePercentTrend(
          data.atendimentosEnfermagem[activeIdx]?.TOTAL ?? 0,
          data.atendimentosEnfermagem[prevIdx]?.TOTAL ?? 0,
          prevMesName,
          false,
        )
      : undefined;

  const totalMerp = filtered.atendimentosMerp.reduce((s, r) => s + r.quantidade, 0);
  const merpTrend =
    prevIdx >= 0
      ? makePercentTrend(
          data.atendimentosMerp[activeIdx]?.quantidade ?? 0,
          data.atendimentosMerp[prevIdx]?.quantidade ?? 0,
          prevMesName,
          false,
        )
      : undefined;

  const totalNaoContratacao = filtered.recomendacaoNaoContratacao.reduce(
    (s, r) => s + r.quantidade,
    0,
  );
  const naoContrTrend =
    prevIdx >= 0
      ? makePercentTrend(
          data.recomendacaoNaoContratacao[activeIdx]?.quantidade ?? 0,
          data.recomendacaoNaoContratacao[prevIdx]?.quantidade ?? 0,
          prevMesName,
          true,
        )
      : undefined;

  const qvPrevista =
    periodo === "ANO"
      ? data.qualidadeVidaResumo.previstaAno
      : filtered.qualidadeVida.reduce((s, r) => s + r.PREVISTA, 0);
  const qvRealizada =
    periodo === "ANO"
      ? data.qualidadeVidaResumo.realizadaAno
      : filtered.qualidadeVida.reduce((s, r) => s + r.REALIZADA, 0);
  const qvTaxaPct =
    periodo === "ANO"
      ? data.qualidadeVidaResumo.taxa * 100
      : qvPrevista > 0
        ? (qvRealizada / qvPrevista) * 100
        : 0;

  return {
    refMesAtual,
    asoRealizado,
    asoPrevisto,
    asoTaxaPct,
    asoTrend,
    totalCat,
    catIsSegmentExact,
    catSublabel,
    catTrend,
    absenteismoMedio,
    absenteismoTrend,
    totalAtestados,
    atestadosTrend,
    totalAfastInss,
    inssTrend,
    limboAtual,
    limboInicial,
    limboMesFinal,
    limboTrend,
    totalEnfermagem,
    enfermagemNoturnoPct,
    enfermagemTrend,
    totalMerp,
    merpTrend,
    totalNaoContratacao,
    naoContrTrend,
    qvPrevista,
    qvRealizada,
    qvTaxaPct,
  };
}

export type InsightItem = {
  id: string;
  tone: "positive" | "warning" | "neutral";
  title: string;
  description: string;
};

export function computeInsights(
  data: DashboardData,
  filtered: FilteredDashboard,
  kpis: ExecutiveKpis,
  segAtivo: string,
  segList: string[],
): InsightItem[] {
  const insights: InsightItem[] = [];

  // 1. Maior pico de absenteísmo no recorte
  let peakVal = -1;
  let peakSeg = "";
  let peakMes = "";
  for (const row of filtered.taxaAbsenteismo) {
    const mes = String(row.mes ?? "");
    for (const s of segList) {
      const val = Number(row[s] ?? 0);
      if (val > peakVal) {
        peakVal = val;
        peakSeg = s;
        peakMes = mes;
      }
    }
  }
  if (peakVal > 0) {
    insights.push({
      id: "absenteismo-pico",
      tone: peakVal >= 2.0 ? "warning" : "neutral",
      title: `Pico de Absenteísmo: ${formatPct(peakVal)}`,
      description: `Registrado em ${peakSeg} no mês de ${peakMes} (média do período: ${formatPct(kpis.absenteismoMedio)}).`,
    });
  }

  // 2. Concentração de CAT por segmento
  const totalCatAno = data.catPorSegmento.reduce((s, r) => s + r.quantidade, 0);
  if (totalCatAno > 0) {
    if (segAtivo === "TODOS") {
      const topCat = [...data.catPorSegmento].sort((a, b) => b.quantidade - a.quantidade)[0];
      if (topCat && topCat.quantidade > 0) {
        const share = (topCat.quantidade / totalCatAno) * 100;
        insights.push({
          id: "cat-concentracao",
          tone: "warning",
          title: `Maior volume de CAT: ${topCat.segmento}`,
          description: `${topCat.quantidade} ocorrências no ano (${formatPct(share, 1)} do total de ${totalCatAno} registros).`,
        });
      }
    } else {
      const segRow = data.catPorSegmento.find((r) => r.segmento === segAtivo);
      const qtd = segRow?.quantidade ?? 0;
      const share = (qtd / totalCatAno) * 100;
      insights.push({
        id: "cat-segmento",
        tone: qtd === 0 ? "positive" : "neutral",
        title: `CAT em ${segAtivo}: ${qtd} no ano`,
        description:
          qtd === 0
            ? "Nenhuma comunicação de acidente registrada para este segmento no ano."
            : `Representa ${formatPct(share, 1)} do total corporativo (${totalCatAno} ocorrências).`,
      });
    }
  }

  // 3. Trajetória do Limbo Previdenciário
  const firstMes = data.meses[filtered.indices[0] ?? 0] ?? "início";
  if (kpis.limboInicial > 0 || kpis.limboAtual > 0) {
    const diff = kpis.limboAtual - kpis.limboInicial;
    if (diff < 0) {
      const pct = Math.abs((diff / kpis.limboInicial) * 100);
      insights.push({
        id: "limbo-evolucao",
        tone: "positive",
        title: `Redução no Limbo: -${formatPct(pct, 0)}`,
        description: `Caiu de ${kpis.limboInicial} (${firstMes}) para ${kpis.limboAtual} casos em ${kpis.limboMesFinal}.`,
      });
    } else if (diff > 0) {
      insights.push({
        id: "limbo-evolucao",
        tone: "warning",
        title: `Atenção ao Limbo: ${kpis.limboAtual} casos`,
        description: `Aumento de +${diff} caso(s) entre ${firstMes} (${kpis.limboInicial}) e ${kpis.limboMesFinal}.`,
      });
    } else {
      insights.push({
        id: "limbo-evolucao",
        tone: "neutral",
        title: `Limbo Previdenciário: ${kpis.limboAtual} casos`,
        description: `Quantidade manteve-se estável em relação a ${firstMes}.`,
      });
    }
  }

  // 4. Conformidade ASO Periódico & Qualidade de Vida
  if (kpis.asoPrevisto > 0) {
    const fullCompliance = kpis.asoTaxaPct >= 98;
    insights.push({
      id: "aso-adesao",
      tone: fullCompliance ? "positive" : "warning",
      title: `Adesão ASO Periódico: ${formatPct(kpis.asoTaxaPct, 0)}`,
      description: `${formatInt(kpis.asoRealizado)} de ${formatInt(kpis.asoPrevisto)} exames realizados • QV com ${formatPct(kpis.qvTaxaPct, 0)} de execução.`,
    });
  }

  return insights.slice(0, 4);
}
