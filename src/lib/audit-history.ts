import type { Json } from "@/integrations/supabase/types";

export const AUDIT_UPDATED = "dashboard-audit-updated";
export const AUDIT_LABELS: Record<string, string> = {
  importacao: "Planilha base importada", edicao: "Check-lists atualizados",
  restauracao: "Base restaurada", anexo_enviado: "Anexo enviado", anexo_removido: "Anexo removido",
};
const fields: Record<string, string> = {
  ultimaExecucao: "Última execução", proximoVencimento: "Próximo vencimento",
  responsavel: "Responsável", unidade: "Unidade",
};
export function auditDetails(value: Json): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const out: string[] = [];
  if (typeof value['servico'] === "string") out.push(value['servico']);
  if (typeof value['path'] === "string") out.push(value['path'].split('/').pop()?.replace(/^\d+-/, '') ?? '');
  const changes = value['campos'];
  if (Array.isArray(changes)) for (const change of changes) {
    if (!change || typeof change !== 'object' || Array.isArray(change)) continue;
    const campo = String(change['campo'] ?? '');
    out.push(`${change['servico'] ?? ''} • ${change['unidade'] ?? ''} — ${fields[campo] ?? campo}: ${change['antes'] || 'Não informado'} → ${change['depois'] || 'Não informado'}`);
  }
  return out;
}
export function notifyAuditUpdated() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUDIT_UPDATED));
}