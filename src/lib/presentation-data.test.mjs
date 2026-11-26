import { expect, test } from 'bun:test';
import { baseDataFor } from './dashboard-store';
import { baseAdm } from './adm-store';
import { presentationValues } from './presentation-data';
const h = baseDataFor('SAUDE','2026'), a = baseAdm('2026');
test('PowerPoint preserva 1195 testes, 411 atendimentos sociais e 13996 viagens anuais', () => {
  const {values}=presentationValues(h,a,'2026','ANO','TODOS');
  expect(values.h_value_4).toBe('1.195');
  expect(values.h_value_5).toBe('411');
  expect(values.a_value_4).toBe('13.996');
  expect(values.a_advance_1.replace(/\s/g, ' ')).toContain('R$ 1.278.429');
});
test('PowerPoint mensal não distribui totais anuais em outubro', () => {
  const {values}=presentationValues(h,a,'2026','M:OUT','TODOS');
  expect(values.h_value_4).toBe('—');
  expect(values.h_value_5).toBe('—');
  expect(values.a_value_4).toBe('—');
  expect(values.a_value_3.replace(/\s/g, ' ')).toBe('R$ 1.825.928');
});
test('PowerPoint usa dados atualizados e não modifica a base', () => {
  const data=structuredClone(a);data.quantidadeViagensTotal=15000;
  const before=JSON.stringify(data);
  expect(presentationValues(h,data,'2026','ANO','TODOS').values.a_value_4).toBe('15.000');
  expect(JSON.stringify(data)).toBe(before);
});