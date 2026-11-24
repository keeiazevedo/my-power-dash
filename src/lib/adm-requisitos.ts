import base from "./adm-requisitos-2026.json";

/** Um requisito legal por serviço + unidade; status é sempre calculado pela data de hoje. */
export type RequisitoRow = {
  servico: string; unidade: string; fornecedor: string;
  /** dd/mm/aaaa ou vazio quando ainda não foi executado. */
  ultimaExecucao: string; validadeDias: number; responsavel: string;
};
export type RequisitoStatus = "EM DIA" | "A VENCER" | "VENCIDO" | "SEM PROGRAMAÇÃO";
export const STATUS_REQ: RequisitoStatus[] = ["EM DIA", "A VENCER", "VENCIDO", "SEM PROGRAMAÇÃO"];
export const UNIDADES_REQ = ["BSG", "Estaleiro", "Guaxindiba", "Rio Sul", "TBV"];
export const UNIDADE_NOME: Record<string, string> = { BSG: "Base São Gonçalo" };
export const baseRequisitos = (): RequisitoRow[] => (base as RequisitoRow[]).map((r) => ({ ...r }));

const DAY = 86400000;
export function parseData(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s ?? "").trim());
  return m ? new Date(Date.UTC(+m[3]!, +m[2]! - 1, +m[1]!)) : null;
}
export const fmtData = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
const dayUTC = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

export type RequisitoCalc = RequisitoRow & { vencimento: Date | null; dias: number | null; status: RequisitoStatus };
export function calcRequisito(r: RequisitoRow, hoje: Date = new Date()): RequisitoCalc {
  const ult = parseData(r.ultimaExecucao);
  if (!ult) return { ...r, vencimento: null, dias: null, status: "SEM PROGRAMAÇÃO" };
  const vencimento = new Date(ult.getTime() + r.validadeDias * DAY);
  const dias = Math.round((vencimento.getTime() - dayUTC(hoje)) / DAY);
  return { ...r, vencimento, dias, status: dias < 0 ? "VENCIDO" : dias <= 30 ? "A VENCER" : "EM DIA" };
}
export const validadeLabel = (d: number) => (d >= 365 ? "Validade anual" : `${d} dias`);
