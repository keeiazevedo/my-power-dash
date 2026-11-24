import { test, expect } from "bun:test";
import * as XLSX from "xlsx";
import { HEALTH_STATUSES, normalizeHealthStatuses } from "./health-status.ts";
import { baseDataFor, buildDashboardWorkbook, importFromExcel } from "./dashboard-store.ts";
const legacy = {
  ...baseDataFor("SAUDE", "2026"),
  statusAfast: ["LIMBO", "ENCERRADO", "ATIVO", "EM ANÁLISE", "APOSENTADO"],
  afastamentoStatus: [
    { mes: "JAN", LIMBO: 14, ENCERRADO: 275, ATIVO: 47, "EM ANÁLISE": 24, APOSENTADO: 8 },
  ],
};
test("status normalization retains only analysis, retired and active without changing their quantities", () => {
  const result = normalizeHealthStatuses(legacy);
  expect(result.statusAfast).toEqual(["EM ANÁLISE", "APOSENTADO", "ATIVO"]);
  expect(result.afastamentoStatus).toEqual([
    { mes: "JAN", "EM ANÁLISE": 24, APOSENTADO: 8, ATIVO: 47 },
  ]);
  expect(legacy.afastamentoStatus[0]?.["LIMBO"]).toBe(14);
});
test("limbo remains an independent unchanged dataset", () => {
  const result = normalizeHealthStatuses(legacy);
  expect(result.limboPrevidenciario).toBe(legacy.limboPrevidenciario);
  expect(result.limboPrevidenciario[0]?.["ESTALEIRO"]).toBe(8);
});
test("base spreadsheet exports only three statuses and preserves all Limbo columns", async () => {
  const wb = buildDashboardWorkbook(legacy);
  expect(XLSX.utils.sheet_to_json(wb.Sheets["Afastamento Status"], { header: 1 })[0]).toEqual([
    "mes",
    ...HEALTH_STATUSES,
  ]);
  expect(XLSX.utils.sheet_to_json(wb.Sheets["Limbo"])).toEqual(legacy.limboPrevidenciario);
  const file = new File([XLSX.write(wb, { type: "array", bookType: "xlsx" })], "base.xlsx");
  const imported = await importFromExcel(file);
  expect(imported.statusAfast).toEqual(HEALTH_STATUSES);
  expect(imported.afastamentoStatus[0]).toEqual({
    mes: "JAN",
    "EM ANÁLISE": 24,
    APOSENTADO: 8,
    ATIVO: 47,
  });
  expect(imported.limboPrevidenciario).toEqual(legacy.limboPrevidenciario);
});
test("legacy spreadsheets cannot reintroduce removed statuses", async () => {
  const wb = buildDashboardWorkbook(legacy);
  wb.Sheets["Afastamento Status"] = XLSX.utils.json_to_sheet(legacy.afastamentoStatus);
  const imported = await importFromExcel(
    new File([XLSX.write(wb, { type: "array", bookType: "xlsx" })], "old.xlsx"),
  );
  expect(Object.keys(imported.afastamentoStatus[0] ?? {})).toEqual(["mes", ...HEALTH_STATUSES]);
  expect(imported.limboPrevidenciario).toEqual(legacy.limboPrevidenciario);
});
