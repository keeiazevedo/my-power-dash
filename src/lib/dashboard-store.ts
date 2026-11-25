import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { carregarOnline, removerOnline, salvarOnline } from "./online-store";
import * as XLSX from "xlsx";
import saude2026 from "./saude-data-2026.json";
import { HEALTH_STATUSES, healthStatusRows, normalizeHealthStatuses } from "./health-status";
import {
  MESES,
  alteracoesAso,
  recomendacaoNaoContratacao,
  asoPeriodicoPrevReal,
  catPorMes,
  catPorSegmento,
  catPorAno,
  atendimentosEnfermagem,
  atendimentosMerp,
  atestadoMedico,
  taxaAbsenteismo,
  afastamentoInss,
  afastamentoStatus,
  limboPrevidenciario,
  qualidadeVida,
  qualidadeVidaResumo,
  SEGMENTOS,
} from "./dashboard-data";

export type DashboardData = {
  meses: string[];
  segmentos: string[];
  statusAfast: string[];
  alteracoesAso: { especialidade: string; ADMISSIONAL: number; PERIODICO: number }[];
  recomendacaoNaoContratacao: { mes: string; quantidade: number }[];
  asoPeriodicoPrevReal: { mes: string; PREVISTOS: number; REALIZADOS: number }[];
  catPorMes: { mes: string; quantidade: number }[];
  catPorSegmento: { segmento: string; quantidade: number }[];
  catPorAno: Record<string, string | number>[];
  atendimentosEnfermagem: { mes: string; DIURNO: number; NOTURNO: number; TOTAL: number }[];
  atendimentosMerp: { mes: string; quantidade: number }[];
  atestadoMedico: Record<string, string | number>[];
  taxaAbsenteismo: Record<string, string | number>[];
  afastamentoInss: Record<string, string | number>[];
  afastamentoStatus: Record<string, string | number>[];
  limboPrevidenciario: Record<string, string | number>[];
  qualidadeVida: { mes: string; PREVISTA: number; REALIZADA: number }[];
  qualidadeVidaResumo: { previstaAno: number; realizadaAno: number; taxa: number };
  testesAlcoolDrogas?: { mes: string; quantidade: number }[];
  atendimentosSociais?: { mes: string; quantidade: number }[];
  /** ASO periódicos ainda pendentes no ano (somados ao previsto anual). */
  asoPendentes?: number;
};

/** Valores iniciais de 2026 (acumulado do ano). */
export const INDICADORES_2026 = {
  testesAlcoolDrogas: [{ mes: "ACUMULADO 2026", quantidade: 1195 }],
  atendimentosSociais: [{ mes: "ACUMULADO 2026", quantidade: 411 }],
  asoPendentes: 272,
};

export const somaQtd = (rows?: { quantidade: number }[]) =>
  (rows ?? []).reduce((s, r) => s + (Number(r.quantidade) || 0), 0);

export const defaultData: DashboardData = {
  meses: MESES,
  segmentos: SEGMENTOS,
  statusAfast: [...HEALTH_STATUSES],
  alteracoesAso,
  recomendacaoNaoContratacao,
  asoPeriodicoPrevReal,
  catPorMes,
  catPorSegmento,
  catPorAno,
  atendimentosEnfermagem,
  atendimentosMerp,
  atestadoMedico,
  taxaAbsenteismo,
  afastamentoInss,
  afastamentoStatus: healthStatusRows(afastamentoStatus),
  limboPrevidenciario,
  qualidadeVida,
  qualidadeVidaResumo,
};

const STORAGE_KEY = "dashboard-saude-data-v1";

// ---------- Sheet definitions ----------
// Each sheet maps to one dataset. We use fixed sheet names + column headers
// so the user can edit in Excel and re-import.

const SHEETS = {
  ASO_ESPECIALIDADE: "ASO Especialidade",
  ASO_NAO_CONTRATACAO: "ASO Nao Contratacao",
  ASO_PREV_REAL: "ASO Previsto Realizado",
  CAT_MES: "CAT Mes",
  CAT_SEGMENTO: "CAT Segmento",
  CAT_ANO: "CAT Ano",
  ENFERMAGEM: "Enfermagem",
  MERP: "MERP",
  ATESTADO: "Atestado",
  ABSENTEISMO: "Absenteismo",
  AFAST_INSS: "Afastamento INSS",
  AFAST_STATUS: "Afastamento Status",
  LIMBO: "Limbo",
  QV: "Qualidade de Vida",
  QV_RESUMO: "QV Resumo",
  TESTES_AD: "Testes Álcool e Drogas",
  SOCIAL: "Atendimentos Sociais",
  ASO_PENDENTES: "ASO Pendentes",
} as const;

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// ---------- Export ----------
export function buildDashboardWorkbook(data: DashboardData) {
  const wb = XLSX.utils.book_new();

  const add = (name: string, rows: unknown[]) => {
    const ws = XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  add(SHEETS.ASO_ESPECIALIDADE, data.alteracoesAso);
  add(SHEETS.ASO_NAO_CONTRATACAO, data.recomendacaoNaoContratacao);
  add(SHEETS.ASO_PREV_REAL, data.asoPeriodicoPrevReal);
  add(SHEETS.CAT_MES, data.catPorMes);
  add(SHEETS.CAT_SEGMENTO, data.catPorSegmento);
  add(SHEETS.CAT_ANO, data.catPorAno);
  add(SHEETS.ENFERMAGEM, data.atendimentosEnfermagem.map(({ mes, DIURNO, NOTURNO }) => ({ mes, DIURNO, NOTURNO })));
  add(SHEETS.MERP, data.atendimentosMerp);
  add(SHEETS.ATESTADO, data.atestadoMedico);
  add(SHEETS.ABSENTEISMO, data.taxaAbsenteismo);
  add(SHEETS.AFAST_INSS, data.afastamentoInss);
  add(SHEETS.AFAST_STATUS, healthStatusRows(data.afastamentoStatus));
  add(SHEETS.LIMBO, data.limboPrevidenciario);
  add(SHEETS.QV, data.qualidadeVida);
  add(SHEETS.QV_RESUMO, [data.qualidadeVidaResumo]);
  add(SHEETS.ASO_PENDENTES, [{ indicador: "ASO periódicos pendentes no ano", quantidade: data.asoPendentes ?? 0 }]);
  const qtdRows = (r?: { mes: string; quantidade: number }[]) =>
    r && r.length ? r : MESES.map((mes) => ({ mes, quantidade: 0 }));
  add(SHEETS.TESTES_AD, qtdRows(data.testesAlcoolDrogas));
  add(SHEETS.SOCIAL, qtdRows(data.atendimentosSociais));

  return wb;
}

export function exportToExcel(data: DashboardData, fileName = "dashboard-saude.xlsx") {
  XLSX.writeFile(buildDashboardWorkbook(data), fileName);
}

// ---------- Import ----------
export async function importFromExcel(file: File, base?: DashboardData): Promise<DashboardData> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const aba = (name: string) => wb.SheetNames.find((n) => semAcento(n) === semAcento(name));
  /** Aba presente no arquivo? O que não vem no arquivo permanece como está. */
  const tem = (name: string) => !!aba(name);
  const manter = <T>(name: string, lido: T[], guardado: T[]) => (tem(name) ? lido : guardado);

  const readSheet = (name: string): Record<string, unknown>[] => {
    const n = aba(name);
    if (!n) return [];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[n], { defval: 0 });
  };

  const alt = readSheet(SHEETS.ASO_ESPECIALIDADE).map((r) => ({
    especialidade: String(r.especialidade ?? ""),
    ADMISSIONAL: toNum(r.ADMISSIONAL),
    PERIODICO: toNum(r.PERIODICO),
  }));

  const naoContr = readSheet(SHEETS.ASO_NAO_CONTRATACAO).map((r) => ({
    mes: String(r.mes ?? ""),
    quantidade: toNum(r.quantidade),
  }));

  const asoPr = readSheet(SHEETS.ASO_PREV_REAL).map((r) => ({
    mes: String(r.mes ?? ""),
    PREVISTOS: toNum(r.PREVISTOS),
    REALIZADOS: toNum(r.REALIZADOS),
  }));

  const catMes = readSheet(SHEETS.CAT_MES).map((r) => ({
    mes: String(r.mes ?? ""),
    quantidade: toNum(r.quantidade),
  }));

  const catSeg = readSheet(SHEETS.CAT_SEGMENTO).map((r) => ({
    segmento: String(r.segmento ?? ""),
    quantidade: toNum(r.quantidade),
  }));

  const catAno = readSheet(SHEETS.CAT_ANO).map((r) => {
    const out: Record<string, string | number> = { segmento: String(r.segmento ?? "") };
    for (const k of Object.keys(r)) if (k !== "segmento") out[k] = toNum(r[k]);
    return out;
  });

  const enf = readSheet(SHEETS.ENFERMAGEM).map((r) => {
    const DIURNO = toNum(r.DIURNO);
    const NOTURNO = toNum(r.NOTURNO);
    return { mes: String(r.mes ?? ""), DIURNO, NOTURNO, TOTAL: DIURNO + NOTURNO };
  });

  const merp = readSheet(SHEETS.MERP).map((r) => ({
    mes: String(r.mes ?? ""),
    quantidade: toNum(r.quantidade),
  }));

  const readSegMes = (name: string) =>
    readSheet(name).map((r) => {
      const out: Record<string, string | number> = { mes: String(r.mes ?? "") };
      for (const k of Object.keys(r)) if (k !== "mes") out[k] = toNum(r[k]);
      return out;
    });

  const atestado = readSegMes(SHEETS.ATESTADO);
  const absent = readSegMes(SHEETS.ABSENTEISMO);
  const afInss = readSegMes(SHEETS.AFAST_INSS);
  const afStatus = healthStatusRows(readSegMes(SHEETS.AFAST_STATUS));
  const limbo = readSegMes(SHEETS.LIMBO);

  const qv = readSheet(SHEETS.QV).map((r) => ({
    mes: String(r.mes ?? ""),
    PREVISTA: toNum(r.PREVISTA),
    REALIZADA: toNum(r.REALIZADA),
  }));

  const readQtd = (name: string) =>
    readSheet(name)
      .map((r) => ({ mes: String(r.mes ?? ""), quantidade: toNum(r.quantidade) }))
      .filter((r) => r.mes);
  const testesAd = readQtd(SHEETS.TESTES_AD);
  const social = readQtd(SHEETS.SOCIAL);

  const asoPendRow = readSheet(SHEETS.ASO_PENDENTES)[0];
  const asoPendentes = asoPendRow ? toNum(asoPendRow.quantidade) : undefined;

  const qvResRow = readSheet(SHEETS.QV_RESUMO)[0] ?? {};
  const qvResumo = {
    previstaAno: toNum(qvResRow.previstaAno),
    realizadaAno: toNum(qvResRow.realizadaAno),
    taxa: toNum(qvResRow.taxa),
  };

  // Derive meses from the biggest month-based sheet
  const meses = (asoPr.length ? asoPr : catMes).map((r) => r.mes).filter(Boolean);

  // Derive segmentos from CAT segmento sheet
  const segmentosLidos = catSeg.map((r) => r.segmento).filter(Boolean);

  /** Mantém a lista mais completa: enviar só algumas abas não encurta meses nem segmentos. */
  const maisCompleto = <T>(...listas: (T[] | undefined)[]) =>
    listas.filter((l): l is T[] => !!l && l.length > 0).sort((a, b) => b.length - a.length)[0] ?? [];

  const statusAfast = [...HEALTH_STATUSES];

  if (!Object.values(SHEETS).some(tem))
    throw new Error("Não encontrei nenhuma aba conhecida na planilha.");

  return {
    meses: maisCompleto(meses, base?.meses, defaultData.meses),
    segmentos: tem(SHEETS.CAT_SEGMENTO)
      ? maisCompleto(segmentosLidos, base?.segmentos, defaultData.segmentos)
      : maisCompleto(base?.segmentos, defaultData.segmentos),
    statusAfast,
    alteracoesAso: manter(SHEETS.ASO_ESPECIALIDADE, alt, base?.alteracoesAso ?? defaultData.alteracoesAso),
    recomendacaoNaoContratacao: manter(SHEETS.ASO_NAO_CONTRATACAO, naoContr, base?.recomendacaoNaoContratacao ?? defaultData.recomendacaoNaoContratacao),
    asoPeriodicoPrevReal: manter(SHEETS.ASO_PREV_REAL, asoPr, base?.asoPeriodicoPrevReal ?? defaultData.asoPeriodicoPrevReal),
    catPorMes: manter(SHEETS.CAT_MES, catMes, base?.catPorMes ?? defaultData.catPorMes),
    catPorSegmento: manter(SHEETS.CAT_SEGMENTO, catSeg, base?.catPorSegmento ?? defaultData.catPorSegmento),
    catPorAno: manter(SHEETS.CAT_ANO, catAno, base?.catPorAno ?? defaultData.catPorAno),
    atendimentosEnfermagem: manter(SHEETS.ENFERMAGEM, enf, base?.atendimentosEnfermagem ?? defaultData.atendimentosEnfermagem),
    atendimentosMerp: manter(SHEETS.MERP, merp, base?.atendimentosMerp ?? defaultData.atendimentosMerp),
    atestadoMedico: manter(SHEETS.ATESTADO, atestado, base?.atestadoMedico ?? defaultData.atestadoMedico),
    taxaAbsenteismo: manter(SHEETS.ABSENTEISMO, absent, base?.taxaAbsenteismo ?? defaultData.taxaAbsenteismo),
    afastamentoInss: manter(SHEETS.AFAST_INSS, afInss, base?.afastamentoInss ?? defaultData.afastamentoInss),
    afastamentoStatus: manter(SHEETS.AFAST_STATUS, afStatus, base?.afastamentoStatus ?? defaultData.afastamentoStatus),
    limboPrevidenciario: manter(SHEETS.LIMBO, limbo, base?.limboPrevidenciario ?? defaultData.limboPrevidenciario),
    qualidadeVida: manter(SHEETS.QV, qv, base?.qualidadeVida ?? defaultData.qualidadeVida),
    qualidadeVidaResumo: tem(SHEETS.QV_RESUMO) ? qvResumo : base?.qualidadeVidaResumo ?? defaultData.qualidadeVidaResumo,
    ...(tem(SHEETS.TESTES_AD)
      ? { testesAlcoolDrogas: testesAd }
      : base?.testesAlcoolDrogas?.length ? { testesAlcoolDrogas: base.testesAlcoolDrogas } : {}),
    ...(tem(SHEETS.SOCIAL)
      ? { atendimentosSociais: social }
      : base?.atendimentosSociais?.length ? { atendimentosSociais: base.atendimentosSociais } : {}),
    ...(tem(SHEETS.ASO_PENDENTES)
      ? asoPendentes !== undefined ? { asoPendentes } : {}
      : base?.asoPendentes !== undefined ? { asoPendentes: base.asoPendentes } : {}),
  };
}

// ---------- Empty template (same structure, zeros) ----------
export function makeEmptyData(ano: string): DashboardData {
  const zeroSegMes = (keys: string[]) =>
    MESES.map((mes) => {
      const r: Record<string, string | number> = { mes };
      keys.forEach((k) => (r[k] = 0));
      return r;
    });
  const yy = Number(ano);
  const anos = [yy - 3, yy - 2, yy - 1, yy];
  return {
    meses: MESES,
    segmentos: SEGMENTOS,
    statusAfast: [...HEALTH_STATUSES],
    alteracoesAso: alteracoesAso.map((r) => ({ especialidade: r.especialidade, ADMISSIONAL: 0, PERIODICO: 0 })),
    recomendacaoNaoContratacao: MESES.map((mes) => ({ mes, quantidade: 0 })),
    asoPeriodicoPrevReal: MESES.map((mes) => ({ mes, PREVISTOS: 0, REALIZADOS: 0 })),
    catPorMes: MESES.map((mes) => ({ mes, quantidade: 0 })),
    catPorSegmento: SEGMENTOS.map((segmento) => ({ segmento, quantidade: 0 })),
    catPorAno: SEGMENTOS.map((segmento) => {
      const r: Record<string, string | number> = { segmento };
      anos.forEach((a) => { r[`${a} s/afast`] = 0; r[`${a} c/afast`] = 0; });
      return r;
    }),
    atendimentosEnfermagem: MESES.map((mes) => ({ mes, DIURNO: 0, NOTURNO: 0, TOTAL: 0 })),
    atendimentosMerp: MESES.map((mes) => ({ mes, quantidade: 0 })),
    atestadoMedico: zeroSegMes(SEGMENTOS),
    taxaAbsenteismo: zeroSegMes(SEGMENTOS),
    afastamentoInss: zeroSegMes(SEGMENTOS),
    afastamentoStatus: zeroSegMes(HEALTH_STATUSES),
    limboPrevidenciario: zeroSegMes(SEGMENTOS),
    qualidadeVida: MESES.map((mes) => ({ mes, PREVISTA: 0, REALIZADA: 0 })),
    qualidadeVidaResumo: { previstaAno: 0, realizadaAno: 0, taxa: 0 },
    testesAlcoolDrogas: MESES.map((mes) => ({ mes, quantidade: 0 })),
    atendimentosSociais: MESES.map((mes) => ({ mes, quantidade: 0 })),
  };
}

export const SETORES = [
  { id: "SAUDE", label: "Saúde" },
  { id: "ADMINISTRATIVO", label: "Administrativo" },
] as const;

export function baseDataFor(setor: string, ano: string): DashboardData {
  if (setor === "SAUDE" && ano === "2026") return normalizeHealthStatuses({ ...(saude2026 as DashboardData), ...INDICADORES_2026 });
  return setor === "SAUDE" && ano === "2025" ? defaultData : makeEmptyData(ano);
}

const keyFor = (setor: string, ano: string) => `dashboard-${setor}-${ano}`;

// ---------- Hook ----------
export function useDashboardData(setor: string, ano: string) {
  const [data, setData] = useState<DashboardData>(() => baseDataFor(setor, ano));

  useEffect(() => {
    let cancel = false;
    const merge = (saved: DashboardData) => {
      const next = baseDataFor(setor, ano);
      return normalizeHealthStatuses({
        ...saved,
        testesAlcoolDrogas: saved.testesAlcoolDrogas?.length ? saved.testesAlcoolDrogas : next.testesAlcoolDrogas,
        atendimentosSociais: saved.atendimentosSociais?.length ? saved.atendimentosSociais : next.atendimentosSociais,
        ...((saved.asoPendentes ?? next.asoPendentes) !== undefined ? { asoPendentes: saved.asoPendentes ?? next.asoPendentes } : {}),
      });
    };
    let next = normalizeHealthStatuses(baseDataFor(setor, ano));
    try {
      const raw =
        localStorage.getItem(keyFor(setor, ano)) ??
        (setor === "SAUDE" && ano === "2025" ? localStorage.getItem(STORAGE_KEY) : null);
      if (raw) next = merge(JSON.parse(raw) as DashboardData);
    } catch {
      /* ignore */
    }
    setData(next);
    carregarOnline<DashboardData>(keyFor(setor, ano)).then((online) => {
      if (!cancel && online) setData(merge(online));
    });
    return () => { cancel = true; };
  }, [setor, ano]);

  const save = useCallback((next: DashboardData) => {
    const normalized = normalizeHealthStatuses(next);
    setData(normalized);
    try {
      localStorage.setItem(keyFor(setor, ano), JSON.stringify(normalized));
    } catch {
      /* ignore */
    }
    salvarOnline(keyFor(setor, ano), normalized).then((ok) =>
      ok ? toast.success("Salvo online para todos") : toast.error("Não foi possível salvar online. Entre como editor."),
    );
  }, [setor, ano]);

  const reset = useCallback(() => {
    setData(baseDataFor(setor, ano));
    try {
      localStorage.removeItem(keyFor(setor, ano));
      if (setor === "SAUDE" && ano === "2025") localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    void removerOnline(keyFor(setor, ano));
  }, [setor, ano]);

  return { data, save, reset };
}
