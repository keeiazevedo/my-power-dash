import { expect, test } from "bun:test";
import { baseRequisitos, calcRequisito } from "./adm-requisitos";

const hoje = new Date(2026, 10, 24);
test("em 24/11/2026: 16 em dia, 4 a vencer, 2 vencidos, 5 sem programação", () => {
  const c = baseRequisitos().map((r) => calcRequisito(r, hoje).status);
  const n = (s) => c.filter((x) => x === s).length;
  expect([n("EM DIA"), n("A VENCER"), n("VENCIDO"), n("SEM PROGRAMAÇÃO")]).toEqual([16, 4, 2, 5]);
});
test("análise de efluentes BSG venceu em 06/10/2026, 49 dias em atraso", () => {
  const r = calcRequisito(baseRequisitos().find((x) => x.servico === "Análise de efluentes" && x.unidade === "BSG"), hoje);
  expect(r.dias).toBe(-49);
});
test("planilha base exporta e reimporta os 27 requisitos legais", async () => {
  const XLSX = await import("xlsx");
  const { baseAdm, buildAdmWorkbook, importAdm } = await import("./adm-store");
  const buf = XLSX.write(buildAdmWorkbook(baseAdm("2026")), { type: "array", bookType: "xlsx" });
  const d = await importAdm({ arrayBuffer: async () => buf });
  expect(d.requisitos.length).toBe(27);
  expect(d.requisitos.filter((r) => calcRequisito(r, hoje).status === "VENCIDO").length).toBe(2);
});
