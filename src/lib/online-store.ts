import { supabase } from "@/integrations/supabase/client";
import { notifyAuditUpdated } from "./audit-history";

/** Dados dos dashboards salvos online (leitura pública; escrita só para editores). */
export async function carregarOnline<T>(chave: string): Promise<T | null> {
  const { data, error } = await supabase.from("dashboard_dados").select("dados").eq("chave", chave).maybeSingle();
  if (error || !data) return null;
  return data.dados as T;
}

export async function salvarOnline(chave: string, dados: unknown, origem: "importacao" | "edicao" = "importacao"): Promise<boolean> {
  const { error } = await supabase
    .from("dashboard_dados")
    .upsert({ chave, dados: dados as never, audit_origem: origem, updated_at: new Date().toISOString() });
  if (!error) notifyAuditUpdated();
  return !error;
}

export async function removerOnline(chave: string): Promise<boolean> {
  const { error } = await supabase.from("dashboard_dados").delete().eq("chave", chave);
  if (!error) notifyAuditUpdated();
  return !error;
}
