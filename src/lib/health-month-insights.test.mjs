import { test, expect } from "bun:test";
import { healthMonthInsights } from "./health-month-insights.ts";

const data = {
  meses: ["JAN", "FEV", "MAR"], segmentos: ["OFFSHORE", "BUNKER"],
  asoPeriodicoPrevReal: [{ mes: "JAN", REALIZADOS: 10 }, { mes: "FEV", REALIZADOS: 15 }, { mes: "MAR", REALIZADOS: 30 }],
  taxaAbsenteismo: [{ mes: "JAN", OFFSHORE: 1, BUNKER: 3 }, { mes: "FEV", OFFSHORE: 2, BUNKER: 4 }],
  atestadoMedico: [{ mes: "JAN", OFFSHORE: 4, BUNKER: 8 }, { mes: "FEV", OFFSHORE: 6, BUNKER: 10 }],
  catPorMes: [{ mes: "JAN", quantidade: 2 }, { mes: "FEV", quantidade: 1 }],
};
test("compares the selected month against its immediately preceding month", () => {
  const result = healthMonthInsights(data, "MAR", data.segmentos);
  expect(result.find(r => r.id === "aso-mensal")?.description).toContain("15 (FEV) → 30 (MAR)");
});
test("segment comparison uses only the selected segment", () => {
  const result = healthMonthInsights(data, "FEV", ["OFFSHORE"]);
  expect(result.find(r => r.id === "atestados-mensal")?.description).toContain("4 (JAN) → 6 (FEV)");
  expect(result.find(r => r.id === "abs-mensal")?.title).toContain("+1 p.p.");
});
test("first month does not fabricate a previous-month comparison", () => {
  expect(healthMonthInsights(data, "JAN", data.segmentos).map(r => r.id)).toEqual(["sem-anterior"]);
});