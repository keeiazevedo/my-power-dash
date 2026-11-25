import { expect, test } from "bun:test";
import * as XLSX from "xlsx";
import { baseAdm, buildAdmWorkbook, ABAS_VIAGENS, importAdm } from "./adm-store";

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
