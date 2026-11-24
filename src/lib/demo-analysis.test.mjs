import { test, expect } from "bun:test";
import { previewAnalysis, searchMetrics } from "./demo-analysis.ts";
import { baseDataFor } from "./dashboard-store.ts";
import { baseAdm } from "./adm-store.ts";
const health = baseDataFor("SAUDE", "2026"),
  adm = baseAdm("2026");
const run = (sector, period = "ANO", segment = "TODOS") =>
  previewAnalysis(health, adm, { sector, period, segment });
test("annual travel quantity remains 13996 and is not allocated to a month or segment", () => {
  expect(run("ADMINISTRATIVO").metrics.find((m) => m.id === "quantidade-viagens")?.value).toBe(
    13996,
  );
  expect(
    run("ADMINISTRATIVO", "M:OUT").metrics.find((m) => m.id === "quantidade-viagens")?.value,
  ).toBeNull();
  expect(
    run("ADMINISTRATIVO", "ANO", "OFFSHORE").metrics.find((m) => m.id === "quantidade-viagens")
      ?.value,
  ).toBeNull();
});
test("monthly and segment costs use only matching rows while calls remain sector-wide", () => {
  const result = run("ADMINISTRATIVO", "M:OUT", "OFFSHORE");
  expect(result.metrics.find((m) => m.id === "uber")?.value).toBe(
    adm.uber
      .filter((r) => r.mes === "OUT" && r.segmento === "OFFSHORE")
      .reduce((s, r) => s + r.valor, 0),
  );
  expect(result.metrics.find((m) => m.id === "chamados")?.value).toBe(
    adm.chamados.filter((r) => r.mes === "OUT").reduce((s, r) => s + r.total, 0),
  );
});
test("annual health totals 1195 and 411 are unavailable in a monthly scope", () => {
  expect(run("SAUDE").metrics.find((m) => m.id === "testes")?.value).toBe(1195);
  expect(run("SAUDE").metrics.find((m) => m.id === "social")?.value).toBe(411);
  expect(run("SAUDE", "M:SET").metrics.find((m) => m.id === "testes")?.value).toBeNull();
});
test("search ignores accents and casing and returns exact matching metric IDs", () => {
  expect(searchMetrics(run("SAUDE").metrics, "ALCOOL").map((m) => m.id)).toEqual(["testes"]);
  expect(searchMetrics(run("ADMINISTRATIVO").metrics, "resolucao").map((m) => m.id)).toEqual([
    "resolucao",
  ]);
});
test("analysis never mutates the imported datasets", () => {
  const before = JSON.stringify({ health, adm });
  run("SAUDE", "M:SET", "OFFSHORE");
  run("ADMINISTRATIVO", "T2");
  expect(JSON.stringify({ health, adm })).toBe(before);
});
