import type { DashboardData } from './dashboard-store';
import type { AdmData } from './adm-store';
import { previewAnalysis, formatMetric } from './demo-analysis';
import { computeExecutiveKpis, filterDashboardByPeriodo, formatInt, formatPct, getPeriodoOptions, type PeriodoId } from './dashboard-analytics';
import { savingDestaque, brl } from './adm-saving';
import { calcRequisito } from './adm-requisitos';

export function presentationValues(health: DashboardData, adm: AdmData, year: string, period: PeriodoId, segment: string) {
  const values: Record<string, string> = {};
  const h = previewAnalysis(health, adm, { sector: 'SAUDE', year, period, segment });
  const a = previewAnalysis(health, adm, { sector: 'ADMINISTRATIVO', year, period, segment });
  const scope = segment === 'TODOS' ? 'Todos os segmentos' : segment;
  const periodName = getPeriodoOptions(health.meses).find(p => p.id === period)?.shortLabel ?? period;
  const fill = (prefix: string, report: typeof h, ids: string[]) => {
    values[`${prefix}_context`] = `${year} • ${periodName} • ${scope} • Dados: ${report.months.join(', ') || 'sem registros'}`;
    ids.forEach((id, i) => {
      const metric = report.metrics.find(m => m.id === id);
      const labels: Record<string,string> = { aso: 'ASO periódicos realizados', cat: 'Total de CAT', atendimento: 'Atendimentos de saúde', atestados: 'Atestados médicos', testes: 'Testes Álcool e Drogas', social: 'Atendimentos Sociais', chamados: 'Chamados Administrativos', resolucao: 'Taxa de resolução', uber: 'Custo Uber', viagens: 'Custo Viagens', 'quantidade-viagens': 'Quantidade de Viagens', 'ticket-uber': 'Ticket médio Uber' };
      values[`${prefix}_label_${i}`] = metric?.label ?? labels[id] ?? id;
      values[`${prefix}_value_${i}`] = metric ? formatMetric(metric) : '—';
      values[`${prefix}_note_${i}`] = metric?.value === null ? 'Sem detalhamento para este período' : metric?.note ?? 'Sem registros no período';
    });
  };
  fill('h', h, ['aso', 'cat', 'atendimento', 'atestados', 'testes', 'social']);
  fill('a', a, ['chamados', 'resolucao', 'uber', 'viagens', 'quantidade-viagens', 'ticket-uber']);
  const segs = segment === 'TODOS' ? health.segmentos : [segment];
  const k = computeExecutiveKpis(health, filterDashboardByPeriodo(health, period, segs), period, segment, segs);
  values['h_advance_0'] = h.empty ? 'Sem registros de Saúde para o período selecionado.' : `ASO periódico: ${formatInt(k.asoRealizado)} realizados de ${formatInt(k.asoPrevisto)} previstos (${formatPct(k.asoTaxaPct, 1)}).`;
  values['h_advance_1'] = h.empty ? '' : `Qualidade de vida: ${formatInt(k.qvRealizada)} ações realizadas de ${formatInt(k.qvPrevista)} previstas. Campanhas e informes.`;
  values['h_advance_2'] = h.empty ? '' : `Limbo previdenciário: ${formatInt(k.limboAtual)} casos na última posição com dados (${k.limboMesFinal || '—'}).`;
  const saving = savingDestaque(adm.viagensTabelas?.find(t => t.aba === 'Saving Aéreo Jan-Out'));
  const calls = adm.chamados.filter(r => a.months.includes(r.mes)).reduce((s,r) => s+r.solucionados,0);
  const rides = a.metrics.find(m => m.id === 'corridas');
  values['a_advance_0'] = a.empty ? 'Sem registros administrativos para o período selecionado.' : `${formatInt(calls)} chamados solucionados; ${rides ? formatMetric(rides) : '—'} corridas Uber registradas.`;
  values['a_advance_1'] = saving.linhas.length ? `Saving aéreo: ${brl(saving.total)} de descontos (${saving.periodo || 'período da base'}). Total sem rateio mensal.` : 'Saving aéreo: sem registros na planilha base.';
  const req = adm.requisitos ?? [];
  const today = new Date();
  values['a_advance_2'] = req.length ? `Check-lists: ${req.length} cadastrados, ${req.filter(r => calcRequisito(r).status === 'EM DIA').length} em dia. Posição atual: ${today.toLocaleDateString('pt-BR')}.` : 'Check-lists: sem registros na base deste ano.';
  values['h_scope'] = 'ASO e atendimentos: consolidado da empresa. Totais anuais sem detalhamento não são rateados. Fonte: bases do painel.';
  values['a_scope'] = 'Chamados e viagens GERAL: setor inteiro. Quantidade anual não rateada. Fonte: bases do painel. Avanços: registros descritivos.';
  return { values, empty: h.empty && a.empty };
}