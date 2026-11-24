import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import base2026 from "./adm-data-2026.json";

export const MESES_ADM = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
export const SEGMENTOS_ADM = ["AMBIENTAL", "BUNKER", "CORPORATIVO", "ESTALEIRO", "OFFSHORE"];
export const ANOS_ADM = ["2026", "2027", "2028"];

export type UberRow = { mes: string; segmento: string; servico: string; valor: number; corridas: number };
export type ViagemRow = { mes: string; segmento: string; produto: string; valor: number; quantidade?: number };
export type ChamadoRow = { mes: string; solucionados: number; total: number };
export type AdmData = { uber: UberRow[]; viagens: ViagemRow[]; chamados: ChamadoRow[] };

const empty: AdmData = { uber: [], viagens: [], chamados: [] };
export const baseAdm = (ano: string): AdmData => (ano === "2026" || ano === "2025" ? (base2026 as AdmData) : empty);

const norm = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
export const toMes = (s: unknown) => {
  const m = norm(s).slice(0, 3);
  return MESES_ADM.includes(m) ? m : "";
};
const toSeg = (s: unknown) => norm(s).split(/\s+/)[0] ?? "";
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const pick = (r: Record<string, unknown>, ...keys: string[]) => {
  const map = Object.fromEntries(Object.keys(r).map((k) => [norm(k), r[k]]));
  for (const k of keys) if (map[norm(k)] !== undefined) return map[norm(k)];
  return undefined;
};

/** Lê a planilha base (mesmo formato do CONSOLIDADO_ADM): abas Uber, Planilha5 (ou Viagens Base) e Chamados. */
export async function importAdm(file: File): Promise<AdmData> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const find = (...names: string[]) => {
    const n = wb.SheetNames.find((s) => names.some((x) => norm(s) === norm(x)));
    return n ? XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[n], { defval: "" }) : [];
  };

  const uberMap = new Map<string, UberRow>();
  for (const r of find("Uber")) {
    const mes = toMes(pick(r, "Referência", "Mes", "Mês"));
    const segmento = toSeg(pick(r, "Segmento"));
    if (!mes || !segmento) continue;
    const servico = String(pick(r, "Serviço", "Servico") ?? "").split("|").pop()!.trim() || "Outros";
    const k = `${mes}|${segmento}|${servico}`;
    const cur = uberMap.get(k) ?? { mes, segmento, servico, valor: 0, corridas: 0 };
    cur.valor += num(pick(r, "Total Geral", "Valor"));
    const c = pick(r, "Corridas");
    cur.corridas += c === undefined || c === "" ? 1 : num(c);
    uberMap.set(k, cur);
  }

  const viaMap = new Map<string, ViagemRow>();
  for (const r of find("Planilha5", "Viagens Base", "Viagens")) {
    const mes = toMes(pick(r, "Ref Mês", "Mes", "Mês"));
    const segmento = toSeg(pick(r, "Área", "Area", "Segmento"));
    const produto = String(pick(r, "Produto Final", "Produto") ?? "").trim();
    if (!mes || !segmento || !produto) continue;
    const k = `${mes}|${segmento}|${produto}`;
    const cur = viaMap.get(k) ?? { mes, segmento, produto, valor: 0 };
    cur.valor += num(pick(r, "Soma de Total Cliente", "Total Cliente", "Valor"));
    const q = pick(r, "Quantidade de Viagens", "Quantidade", "Qtd");
    if (q !== "" && q !== undefined && q !== null) cur.quantidade = (cur.quantidade ?? 0) + num(q);
    viaMap.set(k, cur);
  }

  const chamados: ChamadoRow[] = [];
  for (const r of find("Chamados")) {
    const mes = toMes(pick(r, "Período", "Periodo", "Mês"));
    const total = pick(r, "N° Total de Chamados", "Total");
    if (!mes || total === "" || total === undefined) continue;
    chamados.push({ mes, solucionados: num(pick(r, "N° De Chamados Solucionados", "Solucionados")), total: num(total) });
  }

  const out = { uber: [...uberMap.values()], viagens: [...viaMap.values()], chamados };
  if (!out.uber.length && !out.viagens.length && !out.chamados.length)
    throw new Error("Não encontrei as abas Uber, Planilha5 ou Chamados na planilha.");
  return out;
}

/** Template no mesmo formato da planilha base (abas Uber, Planilha5, Chamados). */
export function exportAdm(d: AdmData, fileName: string) {
  const wb = XLSX.utils.book_new();
  const nome = (m: string) => ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"][MESES_ADM.indexOf(m)];
  const uber = d.uber.length ? d.uber : [{ mes: "JAN", segmento: "OFFSHORE", servico: "UberX", valor: 0, corridas: 0 }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(uber.map((r) => ({
    "Referência": nome(r.mes), Segmento: r.segmento, "Serviço": `Travel | ${r.servico}`, "Total Geral": +r.valor.toFixed(2), Corridas: r.corridas,
  }))), "Uber");
  const via = d.viagens.length ? d.viagens : [{ mes: "JAN", segmento: "OFFSHORE", produto: "AÉREO", valor: 0 }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(via.map((r) => ({
    "Área": r.segmento, "Ref Mês": nome(r.mes), "Produto Final": r.produto, "Soma de Total Cliente": +r.valor.toFixed(2), "Quantidade de Viagens": r.quantidade ?? "",
  }))), "Planilha5");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(MESES_ADM.map((m) => {
    const c = d.chamados.find((x) => x.mes === m);
    return { "Período": nome(m), "N° De Chamados Solucionados": c?.solucionados ?? "", "N° Total de Chamados": c?.total ?? "" };
  })), "Chamados");
  XLSX.writeFile(wb, fileName);
}

const key = (ano: string) => `dashboard-adm-${ano}`;

export function useAdmData(ano: string) {
  const [data, setData] = useState<AdmData>(() => baseAdm(ano));
  useEffect(() => {
    let next = baseAdm(ano);
    try {
      const raw = localStorage.getItem(key(ano));
      if (raw) next = JSON.parse(raw);
    } catch { /* ignore */ }
    setData(next);
  }, [ano]);
  const save = useCallback((d: AdmData) => {
    setData(d);
    try { localStorage.setItem(key(ano), JSON.stringify(d)); } catch { /* ignore */ }
  }, [ano]);
  const reset = useCallback(() => {
    setData(baseAdm(ano));
    try { localStorage.removeItem(key(ano)); } catch { /* ignore */ }
  }, [ano]);
  return { data, save, reset };
}
