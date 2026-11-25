import type { ViagemTabela } from "./adm-store";

/** Valor em reais, sem casas decimais: 1278429 -> "R$ 1.278.429". */
export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Lê "914.099 mil" ou "914.099" como 914099. */
const parse = (v: unknown) => {
  const m = String(v ?? "").match(/[\d.,]+/);
  return m ? Number(m[0].replace(/\./g, "").replace(",", ".")) : 0;
};

export type SavingLinha = { companhia: string; desconto: number; saving: number };

/** Números do destaque de saving, lidos da aba "Saving Aéreo Jan-Out" da planilha base. */
export function savingDestaque(t?: ViagemTabela): {
  total: number;
  linhas: SavingLinha[];
  periodo: string;
} {
  const brutas = (t?.linhas ?? []).filter(
    (r) => r[0] !== null && r[1] !== null && !String(r[0]).toUpperCase().startsWith("TOTAL"),
  );
  const linhas: SavingLinha[] = brutas
    .filter((r) => typeof r[1] === "number")
    .map((r) => ({
      companhia: String(r[0]),
      desconto: typeof r[1] === "number" ? r[1] : 0,
      saving: parse(r[2]),
    }));
  const periodo = String(brutas[0]?.[3] ?? "");
  return { total: linhas.reduce((a, l) => a + l.saving, 0), linhas, periodo };
}
