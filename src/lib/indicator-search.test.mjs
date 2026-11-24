import { test, expect } from "bun:test";
import { findIndicators, HEALTH_INDICATORS, ADM_INDICATORS } from "./indicator-search.ts";
test("health search reaches PQV and specialty indicators outside the executive section", () => {
  expect(findIndicators(HEALTH_INDICATORS, "pqv realizadas").map((i) => i.tab)).toEqual([
    "qualidade-vida",
  ]);
  expect(findIndicators(HEALTH_INDICATORS, "alteracoes").map((i) => i.tab)).toEqual([
    "aso-clinico",
  ]);
});
test("administrative search reaches travel, uber and calls sections", () => {
  expect(findIndicators(ADM_INDICATORS, "viagens produto").map((i) => i.tab)).toEqual([
    "viagens",
    "viagens",
  ]);
  expect(findIndicators(ADM_INDICATORS, "uber servico").map((i) => i.tab)).toEqual(["uber"]);
  expect(findIndicators(ADM_INDICATORS, "solucionados").map((i) => i.tab)).toEqual(["chamados"]);
});
