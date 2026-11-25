import { expect, test } from "bun:test";
import * as XLSX from "xlsx";
import { baseAdm, buildAdmWorkbook, ABAS_VIAGENS, importAdm } from "./adm-store";
import { brl, savingDestaque } from "./adm-saving";

test("custo de viagens 2026 bate com o total geral da planilha (R$ 20.462.579,25)", () => {
  const total = baseAdm("2026").viagens.reduce((s, r) => s + r.valor, 0);
  expect(total).toBeCloseTo(20462579.25, 2);
});

test("outubro soma R$ 1.825.927,80 em viagens", () => {
  const out = baseAdm("2026").viagens.filter((r) => r.mes === "OUT").reduce((s, r) => s + r.valor, 0);
  expect(out).toBeCloseTo(1825927.8, 2);
});

test("planilha base traz as 14 abas de viagens e reimporta com os mesmos valores", async () => {
  const wb = buildAdmWorkbook(baseAdm("2026"));
  for (const a of ABAS_VIAGENS) expect(wb.SheetNames).toContain(a);
  expect(wb.SheetNames).not.toContain("Planilha5");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const file = { arrayBuffer: async () => buf };
  const back = await importAdm(file);
  expect(back.viagens.reduce((s, r) => s + r.valor, 0)).toBeCloseTo(20462579.25, 2);
  expect(back.quantidadeViagensTotal).toBe(13996);
  expect(back.uber.length).toBeGreaterThan(0);
});

test("destaque de saving mostra os três valores em reais, sem a palavra mil", () => {
  const t = baseAdm("2026").viagensTabelas?.find((x) => x.aba === "Saving Aéreo Jan-Out");
  const { total, linhas } = savingDestaque(t);
  const gol = linhas[0];
  const latam = linhas[1];
  const limpa = (s) => s.replace("\u00a0", " ");
  expect(linhas.map((l) => l.companhia)).toEqual(["GOL", "LATAM"]);
  expect(limpa(brl(total))).toBe("R$ 1.278.429");
  expect(limpa(brl(gol.saving))).toBe("R$ 914.099");
  expect(limpa(brl(latam.saving))).toBe("R$ 364.330");
  expect(brl(total)).not.toMatch(/mil/i);
});
