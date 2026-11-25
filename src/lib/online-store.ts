import { supabase } from "@/integrations/supabase/client";

/** Dados dos dashboards salvos online (leitura pública; escrita só para editores). */
export async function carregarOnline<T>(chave: string): Promise<T | null> {
  const { data, error } = await supabase.from("dashboard_dados").select("dados").eq("chave", chave).maybeSingle();
  if (error || !data) return null;
  return data.dados as T;
}

export async function salvarOnline(chave: string, dados: unknown): Promise<boolean> {
  const { error } = await supabase
    .from("dashboard_dados")
    .upsert({ chave, dados: dados as never, updated_at: new Date().toISOString() });
  return !error;
}

export async function removerOnline(chave: string): Promise<boolean> {
  const { error } = await supabase.from("dashboard_dados").delete().eq("chave", chave);
  return !error;
}
