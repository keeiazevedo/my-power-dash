// Dados extraídos de BASE_POWER_BI_SAÚDE_rev1.xlsx

export const MESES = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

export const alteracoesAso = [
  { especialidade: "CARDIOLOGISTA", ADMISSIONAL: 41, PERIODICO: 101 },
  { especialidade: "ENDOCRINOLOGISTA", ADMISSIONAL: 45, PERIODICO: 83 },
  { especialidade: "OFTALMOLOGISTA", ADMISSIONAL: 10, PERIODICO: 54 },
  { especialidade: "DENTISTA", ADMISSIONAL: 33, PERIODICO: 70 },
  { especialidade: "ORTOPEDISTA", ADMISSIONAL: 40, PERIODICO: 77 },
  { especialidade: "OUTRAS", ADMISSIONAL: 67, PERIODICO: 165 },
];

export const recomendacaoNaoContratacao = [
  5, 9, 11, 3, 9, 5, 4, 6, 13, 10, 7, 9,
].map((q, i) => ({ mes: MESES[i], quantidade: q }));

export const asoPeriodicoPrevReal = [
  [86, 86], [159, 159], [241, 241], [172, 172], [245, 245], [205, 205],
  [202, 202], [205, 205], [106, 106], [178, 178], [179, 179], [107, 107],
].map(([p, r], i) => ({ mes: MESES[i], PREVISTOS: p, REALIZADOS: r }));

export const catPorMes = [
  1, 7, 5, 7, 3, 5, 6, 3, 4, 7, 7, 7,
].map((q, i) => ({ mes: MESES[i], quantidade: q }));

export const catPorSegmento = [
  { segmento: "AMBIENTAL", quantidade: 17 },
  { segmento: "BUNKER", quantidade: 19 },
  { segmento: "ESTALEIRO", quantidade: 14 },
  { segmento: "OFFSHORE", quantidade: 12 },
  { segmento: "CORPORATIVO", quantidade: 0 },
];

export const catPorAno = [
  { segmento: "AMBIENTAL",   "2022 s/afast": 9, "2022 c/afast": 1, "2023 s/afast": 15, "2023 c/afast": 2, "2024 s/afast": 16, "2024 c/afast": 3, "2025 s/afast": 17, "2025 c/afast": 3 },
  { segmento: "BUNKER",      "2022 s/afast": 7, "2022 c/afast": 2, "2023 s/afast": 7,  "2023 c/afast": 2, "2024 s/afast": 10, "2024 c/afast": 3, "2025 s/afast": 19, "2025 c/afast": 5 },
  { segmento: "OFFSHORE",    "2022 s/afast": 5, "2022 c/afast": 2, "2023 s/afast": 11, "2023 c/afast": 0, "2024 s/afast": 10, "2024 c/afast": 2, "2025 s/afast": 14, "2025 c/afast": 3 },
  { segmento: "ESTALEIRO",   "2022 s/afast": 4, "2022 c/afast": 0, "2023 s/afast": 6,  "2023 c/afast": 3, "2024 s/afast": 16, "2024 c/afast": 0, "2025 s/afast": 12, "2025 c/afast": 4 },
  { segmento: "CORPORATIVO", "2022 s/afast": 0, "2022 c/afast": 0, "2023 s/afast": 0,  "2023 c/afast": 0, "2024 s/afast": 1,  "2024 c/afast": 1, "2025 s/afast": 0,  "2025 c/afast": 0 },
];

export const atendimentosEnfermagem = [
  [114, 14], [106, 5], [107, 10], [104, 10], [145, 11], [120, 12],
  [128, 7], [127, 17], [139, 9], [150, 9], [154, 1], [118, 10],
].map(([d, n], i) => ({ mes: MESES[i], DIURNO: d, NOTURNO: n, TOTAL: d + n }));

export const atendimentosMerp = [
  2, 10, 6, 15, 16, 29, 9, 19, 7, 6, 4, 0,
].map((q, i) => ({ mes: MESES[i], quantidade: q }));

const segmentos = ["AMBIENTAL", "BUNKER", "OFFSHORE", "ESTALEIRO", "CORPORATIVO"] as const;

function porSegmentoMes(dados: number[][]) {
  // dados: linhas = segmentos, colunas = 12 meses
  return MESES.map((mes, i) => {
    const row: Record<string, string | number> = { mes };
    segmentos.forEach((s, k) => { row[s] = dados[k][i]; });
    return row;
  });
}

export const SEGMENTOS = segmentos as unknown as string[];

export const atestadoMedico = porSegmentoMes([
  [109, 77, 100, 109, 121, 87, 84, 81, 91, 70, 87, 94],
  [59, 29, 34, 34, 49, 38, 38, 38, 48, 46, 37, 40],
  [15, 24, 14, 26, 13, 21, 16, 18, 12, 10, 14, 11],
  [28, 35, 49, 41, 48, 16, 25, 25, 32, 45, 13, 22],
  [11, 6, 12, 8, 7, 5, 6, 11, 9, 17, 8, 2],
]);

export const taxaAbsenteismo = porSegmentoMes([
  [1.462, 1.355, 1.505, 2.279, 1.910, 1.383, 1.468, 1.026, 1.680, 1.525, 1.836, 1.962],
  [1.941, 0.913, 1.438, 1.547, 1.558, 1.586, 1.309, 1.340, 1.952, 1.815, 1.252, 1.569],
  [0.654, 0.841, 0.583, 1.114, 0.556, 0.833, 1.016, 0.778, 0.719, 0.612, 0.761, 0.464],
  [1.222, 1.270, 2.707, 3.096, 2.649, 0.854, 1.274, 1.894, 1.750, 1.882, 0.531, 1.178],
  [0.501, 0.186, 0.252, 0.499, 0.256, 0.611, 0.497, 1.020, 0.340, 1.054, 0.293, 0.058],
]);

export const afastamentoInss = porSegmentoMes([
  [2, 1, 2, 6, 6, 0, 4, 1, 1, 3, 4, 1],
  [2, 4, 2, 6, 1, 1, 3, 4, 1, 0, 2, 0],
  [2, 3, 4, 1, 3, 3, 2, 0, 3, 0, 5, 2],
  [1, 0, 6, 3, 4, 1, 1, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]);

const statusList = ["LIMBO", "ATIVO", "ENCERRADO", "EM ANÁLISE", "APOSENTADO"] as const;
const afastStatusRaw = [
  [20, 20, 16, 15, 15, 15, 14, 16, 16, 14, 14, 14],
  [37, 39, 42, 46, 47, 54, 57, 49, 50, 45, 47, 50],
  [187, 188, 195, 206, 214, 218, 219, 232, 237, 259, 271, 272],
  [24, 25, 27, 39, 39, 33, 40, 37, 38, 31, 23, 19],
  [5, 5, 9, 8, 8, 8, 8, 8, 8, 8, 8, 8],
];
export const STATUS_AFAST = statusList as unknown as string[];
export const afastamentoStatus = MESES.map((mes, i) => {
  const row: Record<string, string | number> = { mes };
  statusList.forEach((s, k) => { row[s] = afastStatusRaw[k][i]; });
  return row;
});

export const limboPrevidenciario = porSegmentoMes([
  [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [4, 4, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1],
  [5, 5, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5],
  [10, 10, 9, 9, 9, 9, 9, 9, 9, 8, 8, 8],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]);

export const qualidadeVida = [
  [4, 4], [9, 9], [8, 8], [4, 4], [8, 8], [3, 3],
  [9, 9], [4, 4], [7, 7], [2, 2], [7, 7], [2, 2],
].map(([p, r], i) => ({ mes: MESES[i], PREVISTA: p, REALIZADA: r }));

export const qualidadeVidaResumo = {
  previstaAno: 67,
  realizadaAno: 67,
  taxa: 1,
};
