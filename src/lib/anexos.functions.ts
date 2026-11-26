import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "checklists-anexos";
const pastaSchema = z.object({ pasta: z.string().regex(/^[a-zA-Z0-9._-]{1,80}$/) });

export const buscarAnexo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => pastaSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: itens } = await supabaseAdmin.storage.from(BUCKET).list(data.pasta, { limit: 10, sortBy: { column: "created_at", order: "desc" } });
    const f = itens?.find((x) => x.id);
    return f ? { path: `${data.pasta}/${f.name}` } : null;
  });

export const abrirAnexo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ path: z.string().regex(/^[a-zA-Z0-9._-]{1,80}\/[a-zA-Z0-9._-]{1,120}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(data.path, 600);
    return { url: s?.signedUrl ?? null };
  });

export const removerAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().regex(/^[a-zA-Z0-9._-]{1,80}\/[a-zA-Z0-9._-]{1,120}$/), ano: z.string().regex(/^\d{4}$/), label: z.string().max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("is_editor");
    if (ok !== true) throw new Error("Sem permissão de edição.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([data.path]);
    if (error) throw error;
    const { error: auditError } = await supabaseAdmin.from('dashboard_auditoria').insert({
      chave: `dashboard-adm-${data.ano}`, acao: 'anexo_removido', editor_id: context.userId,
      editor_email: String(context.claims['email'] ?? 'Editor'), detalhes: { path: data.path, servico: data.label },
    });
    if (auditError) throw auditError;
    return { ok: true };
  });
