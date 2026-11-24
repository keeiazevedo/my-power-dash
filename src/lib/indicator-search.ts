import { normalizeSearch } from "./demo-analysis";
export type IndicatorEntry = { label: string; target: string; tab: string };
const entries = (tab: string, labels: string[]): IndicatorEntry[] =>
  labels.map((label) => ({ label, target: label, tab }));
export const HEALTH_INDICATORS: IndicatorEntry[] = [
  ...entries("visao-executiva", [
    "ASO Periódico",
    "Taxa Absenteísmo",
    "Comunicações CAT",
    "Atestados Médicos",
    "Casos em Limbo",
    "Atend. Clínicos",
    "Testes Álcool e Drogas",
    "Atendimentos Sociais",
  ]),
  ...entries("aso-clinico", [
    "ASO Previsto",
    "ASO Realizado",
    "Não Contratação",
    "Atend. Enfermagem",
    "Atend. MERP",
    "ASO Periódico - Previsto x Realizado",
    "Alterações no ASO por Especialidade",
    "Recomendação de Não Contratação (ASO)",
    "Atendimentos de Enfermagem",
    "Atendimentos MERP",
  ]),
  ...entries("seguranca-cat", [
    "Total de CAT",
    "Média Mensal CAT",
    "CAT Anual por Segmento",
    "CAT por Mês",
    "CAT por Segmento",
    "CAT por Ano - Consolidado Histórico",
  ]),
  ...entries("absenteismo-inss", [
    "Taxa Média Absenteísmo",
    "Total Atestados",
    "Novos Afast. INSS",
    "Limbo Previdenciário",
    "Atestados Médicos por Segmento",
    "Taxa de Absenteísmo (%)",
    "Afastamento INSS por Segmento",
    "Afastamentos por Status",
    "Limbo Previdenciário por Segmento",
  ]),
  ...entries("qualidade-vida", [
    "Ações PQV Previstas",
    "Ações PQV Realizadas",
    "% Atendimento QV",
    "Ações PQV - Previsto x Realizado",
  ]),
];
export const ADM_INDICATORS: IndicatorEntry[] = [
  ...entries("visao-executiva", [
    "Chamados Administrativos",
    "Taxa de Resolução",
    "Custo Uber",
    "Corridas Uber",
    "Ticket Médio Uber",
    "Custo Viagens",
    "Quantidade de Viagens",
    "Ticket Médio Viagens",
  ]),
  ...entries("uber", [
    "Custo Uber por Mês",
    "Corridas Uber por Mês",
    "Uber por Segmento",
    "Uber por Tipo de Serviço",
  ]),
  ...entries("viagens", [
    "Custo com Viagens por Mês",
    "Viagens por Produto (Top 5)",
    "Viagens por Segmento",
    "Viagens por Produto",
  ]),
  {
    label: "Chamados: Solucionados x Total",
    target: "CHAMADO DO ADMINISTRATIVO - SOLUCIONADOS X TOTAL",
    tab: "chamados",
  },
];
export function findIndicators(items: IndicatorEntry[], query: string) {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return items.filter((item) => words.every((word) => normalizeSearch(item.label).includes(word)));
}
