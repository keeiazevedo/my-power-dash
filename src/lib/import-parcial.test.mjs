import { expect, test } from "bun:test";
import * as XLSX from "xlsx";
import { baseAdm, buildAdmWorkbook, importAdm } from "./adm-store";
import { baseDataFor, buildDashboardWorkbook, importFromExcel } from "./dashboard-store";

const fileOf = (wb) => {
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return { arrayBuffer: async () => buf };
};

/** Arquivo com apenas algumas abas da planilha base. */
const somente = (wb, nomes) => {
  const parcial = XLSX.utils.book_new();
  for (const n of nomes) XLSX.utils.book_append_sheet(parcial, wb.Sheets[n], n);
  return parcial;
};

const custoViagens = (d) => d.viagens.reduce((s, r) => s + r.valor, 0);

test("administrativo: enviar só uma aba de viagens preserva as demais abas", async () => {
  const base = baseAdm("2026");
  const parcial = somente(buildAdmWorkbook(base), ["TOP 10 Hotéis"]);
  const back = await importAdm(fileOf(parcial), base);

  expect(custoViagens(back)).toBeCloseTo(20462579.25, 2);
  expect(back.quantidadeViagensTotal).toBe(13996);
  expect(back.uber.length).toBe(base.uber.length);
  expect(back.chamados.length).toBe(base.chamados.length);
  expect(back.viagensTabelas?.map((t) => t.aba)).toEqual(base.viagensTabelas?.map((t) => t.aba));
  expect(back.requisitos?.length).toBe(base.requisitos?.length);
});

test("administrativo: aba enviada substitui apenas ela mesma", async () => {
  const base = baseAdm("2026");
  const parcial = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    parcial,
    XLSX.utils.json_to_sheet([
      { "Período": "JANEIRO", "N° De Chamados Solucionados": 1, "N° Total de Chamados": 2 },
    ]),
    "Chamados",
  );
  const back = await importAdm(fileOf(parcial), base);

  expect(back.chamados).toEqual([{ mes: "JAN", solucionados: 1, total: 2 }]);
  expect(custoViagens(back)).toBeCloseTo(20462579.25, 2);
  expect(back.quantidadeViagensTotal).toBe(13996);
  expect(back.uber.length).toBe(base.uber.length);
});

test("administrativo: arquivo sem nenhuma aba conhecida é rejeitado", async () => {
  const base = baseAdm("2026");
  const vazio = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(vazio, XLSX.utils.json_to_sheet([{ a: 1 }]), "Outra");
  await expect(importAdm(fileOf(vazio), base)).rejects.toThrow();
});

test("saúde: enviar só a aba CAT Mes mantém as demais", async () => {
  const base = baseDataFor("SAUDE", "2026");
  const parcial = somente(buildDashboardWorkbook(base), ["CAT Mes"]);
  const back = await importFromExcel(fileOf(parcial), base);

  expect(back.catPorMes).toEqual(base.catPorMes);
  expect(back.asoPeriodicoPrevReal).toEqual(base.asoPeriodicoPrevReal);
  expect(back.qualidadeVida).toEqual(base.qualidadeVida);
  expect(back.asoPendentes).toBe(base.asoPendentes);
  expect(back.meses).toEqual(base.meses);
  expect(back.segmentos).toEqual(base.segmentos);
});

test("saúde: aba enviada substitui apenas ela mesma", async () => {
  const base = baseDataFor("SAUDE", "2026");
  const parcial = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    parcial,
    XLSX.utils.json_to_sheet([{ mes: "JAN", quantidade: 7 }]),
    "CAT Mes",
  );
  const back = await importFromExcel(fileOf(parcial), base);

  expect(back.catPorMes).toEqual([{ mes: "JAN", quantidade: 7 }]);
  expect(back.asoPeriodicoPrevReal).toEqual(base.asoPeriodicoPrevReal);
  expect(back.meses).toEqual(base.meses);
});
