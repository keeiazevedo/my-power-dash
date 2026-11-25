import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { carregarOnline, removerOnline, salvarOnline } from "./online-store";
import * as XLSX from "xlsx";
import base2026 from "./adm-data-2026.json";
import { baseRequisitos, calcRequisito, fmtData, parseData, type RequisitoRow } from "./adm-requisitos";

export const MESES_ADM = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
export const SEGMENTOS_ADM = ["AMBIENTAL", "BUNKER", "CORPORATIVO", "ESTALEIRO", "OFFSHORE"];
export const ANOS_ADM = ["2026", "2027", "2028"];

export type UberRow = { mes: string; segmento: string; servico: string; valor: number; corridas: number };
export type ViagemRow = { mes: string; segmento: string; produto: string; valor: number; quantidade?: number };
/** Aba de viagens no mesmo formato da planilha VIAGENS GERAL: título na A1, cabeçalho na linha indicada. */
export type ViagemTabela = { aba: string; titulo: string; linhaCabecalho: number; cabecalho: string[]; linhas: (string | number | null)[][] };
export const ABAS_VIAGENS = [
  "TOP 10 Trechos", "TOP 10 Hotéis", "TOP 10 Locadoras", "TOP 10 VIAJANTES AÉREO", "TOP 10 VIAJANTES HOTEL",
  "TOP 10 VIAJANTES CARRO", "TOP 10 Centros Custo", "Fora Política AÉREO", "Saving Aéreo Jan-Out", "Fora Política HOTEL",
  "Carro Fora 48 Horas", "Resumo Antecedência", "CONSOLIDADO PRODUTO GERAL", "CONSOLIDADO PRODUTO MÊS A MÊS",
];
export const ABA_MES_A_MES = "CONSOLIDADO PRODUTO MÊS A MÊS";
/** Viagens não têm segmento na planilha: representam o setor inteiro. */
export const SEGMENTO_GERAL = "GERAL";
export type ChamadoRow = { mes: string; solucionados: number; total: number };
export type AdmData = {
  uber: UberRow[];
  viagens: ViagemRow[];
  chamados: ChamadoRow[];
  /** Total anual informado sem distribuição por mês, produto ou segmento. */
  quantidadeViagensTotal: number | null;
  viagensTabelas?: ViagemTabela[];
  requisitos?: RequisitoRow[];
};

const empty: AdmData = { uber: [], viagens: [], chamados: [], quantidadeViagensTotal: null };
const MES_NOME: Record<string, string> = { JANEIRO: "JAN", FEVEREIRO: "FEV", MARCO: "MAR", ABRIL: "ABR", MAIO: "MAI", JUNHO: "JUN", JULHO: "JUL", AGOSTO: "AGO", SETEMBRO: "SET", OUTUBRO: "OUT", NOVEMBRO: "NOV", DEZEMBRO: "DEZ" };
/** Converte a aba "CONSOLIDADO PRODUTO MÊS A MÊS" em linhas mensais por produto. */
export function viagensFromTabelas(tabs: ViagemTabela[]): ViagemRow[] {
  const t = tabs.find((x) => norm(x.aba) === norm(ABA_MES_A_MES));
  if (!t) return [];
  const cols = t.cabecalho.map((h) => MES_NOME[norm(h)] ?? "");
  const out: ViagemRow[] = [];
  for (const r of t.linhas) {
    const produto = String(r[0] ?? "").trim();
    if (!produto || norm(produto).startsWith("TOTAL")) continue;
    cols.forEach((mes, i) => { if (mes && r[i] !== null && r[i] !== "" && r[i] !== undefined) out.push({ mes, segmento: SEGMENTO_GERAL, produto, valor: num(r[i]) }); });
  }
  return out;
}
const withViagens = (d: AdmData): AdmData => (d.viagensTabelas?.length ? { ...d, viagens: viagensFromTabelas(d.viagensTabelas) } : d);
export const baseAdm = (ano: string): AdmData => (ano === "2026" || ano === "2025" ? { ...withViagens(base2026 as AdmData), requisitos: baseRequisitos() } : empty);

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

/** Lê a planilha base (mesmo formato do CONSOLIDADO_ADM): abas Uber, Planilha5 (ou Viagens Base), Chamados e Indicadores. */
export async function importAdm(file: File, base?: AdmData): Promise<AdmData> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  /** Aba presente no arquivo? O que não vem no arquivo permanece como está. */
  const tem = (...names: string[]) => wb.SheetNames.some((s) => names.some((x) => norm(s) === norm(x)));
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
  const uber = tem("Uber") ? [...uberMap.values()] : base?.uber ?? [];

  const lidas = new Map<string, ViagemTabela>();
  for (const aba of ABAS_VIAGENS) {
    const n = wb.SheetNames.find((s) => norm(s) === norm(aba));
    if (!n) continue;
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(wb.Sheets[n], { header: 1, defval: null, blankrows: true });
    const clean = rows.map((r) => r.map((v) => (typeof v === "string" ? v.trim() || null : v ?? null)));
    const h = clean.findIndex((r) => r.filter((v) => v !== null).length >= 3);
    if (h < 0) continue;
    const cabecalho = clean[h]!.map((v) => String(v ?? ""));
    while (cabecalho.length && !cabecalho[cabecalho.length - 1]) cabecalho.pop();
    const linhas = clean.slice(h + 1).map((r) => Array.from({ length: cabecalho.length }, (_, i) => r[i] ?? null));
    while (linhas.length && linhas[linhas.length - 1]!.every((v) => v === null)) linhas.pop();
    const titulo = String(clean.flat().find((v) => v !== null) ?? aba);
    lidas.set(aba, { aba, titulo, linhaCabecalho: h + 1, cabecalho, linhas });
  }
  // Abas que não vieram no arquivo continuam com os dados atuais.
  const guardadas = new Map((base?.viagensTabelas ?? []).map((t) => [norm(t.aba), t]));
  const viagensTabelas: ViagemTabela[] = [];
  for (const aba of ABAS_VIAGENS) {
    const t = lidas.get(aba) ?? guardadas.get(norm(aba));
    if (t) viagensTabelas.push(t);
  }

  const viaMap = new Map<string, ViagemRow>();
  for (const r of viagensTabelas.length ? [] : find("Planilha5", "Viagens Base", "Viagens")) {
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

  const chamadosLidos: ChamadoRow[] = [];
  for (const r of find("Chamados")) {
    const mes = toMes(pick(r, "Período", "Periodo", "Mês"));
    const total = pick(r, "N° Total de Chamados", "Total");
    if (!mes || total === "" || total === undefined) continue;
    chamadosLidos.push({ mes, solucionados: num(pick(r, "N° De Chamados Solucionados", "Solucionados")), total: num(total) });
  }
  const chamados = tem("Chamados") ? chamadosLidos : base?.chamados ?? [];

  const totalRow = find("Indicadores", "Resumo").find(
    (r) => norm(pick(r, "Indicador", "Métrica", "Metrica", "Nome")) === "QUANTIDADE DE VIAGENS",
  );
  const quantidadeViagensTotal = tem("Indicadores", "Resumo")
    ? totalRow ? num(pick(totalRow, "Valor", "Quantidade", "Total")) : null
    : base?.quantidadeViagensTotal ?? null;

  const reqRows = find("Check-lists Legais", "Check-lists", "Requisitos Legais", "Requisitos");
  const requisitos: RequisitoRow[] = [];
  for (const r of reqRows) {
    const servico = String(pick(r, "Serviço", "Servico") ?? "").trim();
    const unidade = String(pick(r, "Unidade") ?? "").trim();
    if (!servico || !unidade) continue;
    const u = pick(r, "Última Execução", "Ultima Execucao");
    const ultimaExecucao = typeof u === "number" ? fmtSerial(u) : String(u ?? "").trim();
    const v = norm(pick(r, "Validade (dias)", "Validade"));
    requisitos.push({ servico, unidade, fornecedor: String(pick(r, "Fornecedor") ?? "").trim(), ultimaExecucao: parseData(ultimaExecucao) ? ultimaExecucao : "",
      validadeDias: v.includes("ANUAL") ? 365 : num(v) || 180, responsavel: String(pick(r, "Responsável", "Responsavel") ?? "").trim() });
    const pv = pick(r, "Próximo Vencimento", "Proximo Vencimento");
    const proximo = typeof pv === "number" ? fmtSerial(pv) : String(pv ?? "").trim();
    const last = requisitos[requisitos.length - 1]!;
    if (parseData(proximo)) {
      const calc = parseData(last.ultimaExecucao);
      const auto = calc ? new Date(calc.getTime() + last.validadeDias * 86400000) : null;
      if (!auto || auto.getTime() !== parseData(proximo)!.getTime()) last.proximoVencimento = proximo;
    }
  }

  const viagens = viagensTabelas.length
    ? viagensFromTabelas(viagensTabelas)
    : tem("Planilha5", "Viagens Base", "Viagens") ? [...viaMap.values()] : base?.viagens ?? [];
  const out: AdmData = { uber, viagens, chamados, quantidadeViagensTotal };
  if (viagensTabelas.length) out.viagensTabelas = viagensTabelas;
  if (tem("Check-lists Legais", "Check-lists", "Requisitos Legais", "Requisitos")) out.requisitos = requisitos;
  else if (base?.requisitos) out.requisitos = base.requisitos;
  if (!lidas.size && !tem("Uber", "Chamados", "Indicadores", "Resumo", "Planilha5", "Viagens Base", "Viagens", "Check-lists Legais", "Check-lists", "Requisitos Legais", "Requisitos"))
    throw new Error("Não encontrei as abas Uber, Chamados, Viagens ou Check-lists Legais na planilha.");
  return out;
}

/** Template no mesmo formato da planilha base (abas Uber, Planilha5, Chamados e Indicadores). */
export function buildAdmWorkbook(d: AdmData) {
  const wb = XLSX.utils.book_new();
  const nome = (m: string) => ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"][MESES_ADM.indexOf(m)];
  const uber = d.uber.length ? d.uber : [{ mes: "JAN", segmento: "OFFSHORE", servico: "UberX", valor: 0, corridas: 0 }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(uber.map((r) => ({
    "Referência": nome(r.mes), Segmento: r.segmento, "Serviço": `Travel | ${r.servico}`, "Total Geral": +r.valor.toFixed(2), Corridas: r.corridas,
  }))), "Uber");
  const tabs = d.viagensTabelas?.length ? d.viagensTabelas : (base2026 as AdmData).viagensTabelas ?? [];
  for (const aba of ABAS_VIAGENS) {
    const t = tabs.find((x) => norm(x.aba) === norm(aba));
    if (!t) continue;
    const aoa: (string | number | null)[][] = [[t.titulo]];
    while (aoa.length < t.linhaCabecalho - 1) aoa.push([]);
    aoa.push(t.cabecalho, ...t.linhas);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = t.cabecalho.map((h, i) => ({ wch: i === 1 || i === 0 ? 34 : Math.max(14, h.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, aba.slice(0, 31));
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(MESES_ADM.map((m) => {
    const c = d.chamados.find((x) => x.mes === m);
    return { "Período": nome(m), "N° De Chamados Solucionados": c?.solucionados ?? "", "N° Total de Chamados": c?.total ?? "" };
  })), "Chamados");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    { Indicador: "Quantidade de Viagens", Valor: d.quantidadeViagensTotal ?? "" },
  ]), "Indicadores");
  const req = d.requisitos ?? baseRequisitos();
  const wsReq = XLSX.utils.json_to_sheet(req.map((r) => {
    const c = calcRequisito(r);
    return {
      "Serviço": r.servico, Unidade: r.unidade, Fornecedor: r.fornecedor, "Última Execução": r.ultimaExecucao,
      "Validade (dias)": r.validadeDias >= 365 ? "Anual" : r.validadeDias,
      "Próximo Vencimento": c.vencimento ? fmtData(c.vencimento) : "", "Responsável": r.responsavel, "Status (automático)": c.status,
    };
  }), { header: ["Serviço", "Unidade", "Fornecedor", "Última Execução", "Validade (dias)", "Próximo Vencimento", "Responsável", "Status (automático)"] });
  wsReq["!cols"] = [{ wch: 38 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsReq, "Check-lists Legais");
  return wb;
}
export function exportAdm(d: AdmData, fileName: string) {
  XLSX.writeFile(buildAdmWorkbook(d), fileName);
}

function fmtSerial(n: number) {
  const d = XLSX.SSF.parse_date_code(n);
  return d ? `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}/${d.y}` : "";
}

const key = (ano: string) => `dashboard-adm-${ano}`;

export function useAdmData(ano: string) {
  const [data, setData] = useState<AdmData>(() => baseAdm(ano));
  useEffect(() => {
    let cancel = false;
    const merge = (saved: AdmData): AdmData => {
      const base = baseAdm(ano);
      // Dados salvos antes da nova estrutura de viagens recebem a base atual de viagens.
      if (!saved.viagensTabelas?.length && base.viagensTabelas?.length) {
        saved.viagens = base.viagens;
        saved.viagensTabelas = base.viagensTabelas;
      }
      if (!saved.requisitos && base.requisitos) saved.requisitos = base.requisitos;
      return {
        ...saved,
        quantidadeViagensTotal: Object.prototype.hasOwnProperty.call(saved, "quantidadeViagensTotal")
          ? saved.quantidadeViagensTotal
          : base.quantidadeViagensTotal,
      };
    };
    let next = baseAdm(ano);
    try {
      const raw = localStorage.getItem(key(ano));
      if (raw) next = merge(JSON.parse(raw) as AdmData);
    } catch { /* ignore */ }
    setData(next);
    carregarOnline<AdmData>(key(ano)).then((online) => {
      if (!cancel && online) setData(merge(online));
    });
    return () => { cancel = true; };
  }, [ano]);
  const save = useCallback((d: AdmData) => {
    setData(d);
    try { localStorage.setItem(key(ano), JSON.stringify(d)); } catch { /* ignore */ }
    salvarOnline(key(ano), d).then((ok) => { if (!ok) toast.error("Não foi possível salvar online. Entre como editor."); });
  }, [ano]);
  const reset = useCallback(() => {
    setData(baseAdm(ano));
    try { localStorage.removeItem(key(ano)); } catch { /* ignore */ }
    void removerOnline(key(ano));
  }, [ano]);
  return { data, save, reset };
}
