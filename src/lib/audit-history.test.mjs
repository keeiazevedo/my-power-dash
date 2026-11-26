import { expect, test } from 'bun:test';
import { auditDetails } from './audit-history';

test('histórico mostra a data anterior e a nova de um check-list', () => {
  expect(auditDetails({ campos: [{ servico: 'AVCB', unidade: 'BSG', campo: 'ultimaExecucao', antes: '01/01/2026', depois: '26/11/2026' }] }))
    .toEqual(['AVCB • BSG — Última execução: 01/01/2026 → 26/11/2026']);
});
test('histórico identifica o anexo sem expor um link de acesso', () => {
  expect(auditDetails({ servico: 'AVCB', path: 'AVCB_0/123-documento.pdf' })).toEqual(['AVCB', 'documento.pdf']);
});