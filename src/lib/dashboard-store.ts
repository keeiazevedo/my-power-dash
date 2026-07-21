import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";
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
  STATUS_AFAST,
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
};

export const defaultData: DashboardData = {
  meses: MESES,
  segmentos: SEGMENTOS,
  statusAfast: STATUS_AFAST,
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
} as const;

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// ---------- Export ----------
export function exportToExcel(data: DashboardData) {
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
  add(SHEETS.AFAST_STATUS, data.afastamentoStatus);
  add(SHEETS.LIMBO, data.limboPrevidenciario);
  add(SHEETS.QV, data.qualidadeVida);
  add(SHEETS.QV_RESUMO, [data.qualidadeVidaResumo]);

  XLSX.writeFile(wb, "dashboard-saude.xlsx");
}

// ---------- Import ----------
export async function importFromExcel(file: File): Promise<DashboardData> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const readSheet = (name: string): Record<string, unknown>[] => {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: 0 });
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
  const afStatus = readSegMes(SHEETS.AFAST_STATUS);
  const limbo = readSegMes(SHEETS.LIMBO);

  const qv = readSheet(SHEETS.QV).map((r) => ({
    mes: String(r.mes ?? ""),
    PREVISTA: toNum(r.PREVISTA),
    REALIZADA: toNum(r.REALIZADA),
  }));

  const qvResRow = readSheet(SHEETS.QV_RESUMO)[0] ?? {};
  const qvResumo = {
    previstaAno: toNum(qvResRow.previstaAno),
    realizadaAno: toNum(qvResRow.realizadaAno),
    taxa: toNum(qvResRow.taxa),
  };

  // Derive meses from the biggest month-based sheet
  const meses = (asoPr.length ? asoPr : catMes).map((r) => r.mes).filter(Boolean);

  // Derive segmentos from CAT segmento sheet
  const segmentos = catSeg.length
    ? catSeg.map((r) => r.segmento).filter(Boolean)
    : defaultData.segmentos;

  // Derive status from afast status sheet
  const statusAfast = afStatus[0]
    ? Object.keys(afStatus[0]).filter((k) => k !== "mes")
    : defaultData.statusAfast;

  return {
    meses: meses.length ? meses : defaultData.meses,
    segmentos,
    statusAfast,
    alteracoesAso: alt.length ? alt : defaultData.alteracoesAso,
    recomendacaoNaoContratacao: naoContr.length ? naoContr : defaultData.recomendacaoNaoContratacao,
    asoPeriodicoPrevReal: asoPr.length ? asoPr : defaultData.asoPeriodicoPrevReal,
    catPorMes: catMes.length ? catMes : defaultData.catPorMes,
    catPorSegmento: catSeg.length ? catSeg : defaultData.catPorSegmento,
    catPorAno: catAno.length ? catAno : defaultData.catPorAno,
    atendimentosEnfermagem: enf.length ? enf : defaultData.atendimentosEnfermagem,
    atendimentosMerp: merp.length ? merp : defaultData.atendimentosMerp,
    atestadoMedico: atestado.length ? atestado : defaultData.atestadoMedico,
    taxaAbsenteismo: absent.length ? absent : defaultData.taxaAbsenteismo,
    afastamentoInss: afInss.length ? afInss : defaultData.afastamentoInss,
    afastamentoStatus: afStatus.length ? afStatus : defaultData.afastamentoStatus,
    limboPrevidenciario: limbo.length ? limbo : defaultData.limboPrevidenciario,
    qualidadeVida: qv.length ? qv : defaultData.qualidadeVida,
    qualidadeVidaResumo: qvResRow && Object.keys(qvResRow).length ? qvResumo : defaultData.qualidadeVidaResumo,
  };
}

// ---------- Hook ----------
export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(defaultData);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const save = useCallback((next: DashboardData) => {
    setData(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const reset = useCallback(() => {
    setData(defaultData);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { data, save, reset };
}
