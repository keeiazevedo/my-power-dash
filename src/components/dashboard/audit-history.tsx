import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, History, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEditor } from "@/hooks/use-editor";
import { Button } from "@/components/ui/button";
import { AUDIT_LABELS, AUDIT_UPDATED, auditDetails } from "@/lib/audit-history";

export function AuditHistory({ chave }: { chave: string }) {
  const { isEditor } = useEditor();
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(20);
  const query = useQuery({
    queryKey: ['audit-history', chave, limit], enabled: isEditor && open,
    queryFn: async () => {
      const { data, error } = await supabase.from('dashboard_auditoria')
        .select('id,created_at,acao,editor_email,detalhes').eq('chave', chave)
        .order('created_at', { ascending: false }).limit(limit + 1);
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const update = () => { if (isEditor && open) void query.refetch(); };
    window.addEventListener(AUDIT_UPDATED, update);
    return () => window.removeEventListener(AUDIT_UPDATED, update);
  }, [isEditor, open, query.refetch]);
  if (!isEditor) return null;
  return <section className="presentation-tools no-print border-t pt-2">
    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setOpen(!open)} aria-expanded={open}>
      <History className="size-3.5" />Histórico de atualizações<ChevronDown className={`size-3.5 ${open ? 'rotate-180' : ''}`} />
    </Button>
    {open && <div className="mt-3 space-y-3 pb-3">
      <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Registros a partir de 26/11/2026 • horário de Brasília</p>
        <Button variant="ghost" size="icon" aria-label="Atualizar histórico" title="Atualizar histórico" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={`size-3.5 ${query.isFetching ? 'animate-spin' : ''}`} /></Button>
      </div>
      {query.isPending ? <p className="text-sm text-muted-foreground">Carregando histórico…</p> : query.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível consultar o histórico. Tente atualizar.</p> : !query.data?.length ? <p className="text-sm text-muted-foreground">Nenhuma atualização registrada ainda.</p> : <ol className="ml-2 space-y-4 border-l border-border pl-4">
        {query.data.slice(0, limit).map(row => <li key={row.id} className="relative text-sm">
          <span className="absolute -left-5 top-1.5 size-2 rounded-full bg-primary" />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><strong>{AUDIT_LABELS[row.acao] ?? row.acao}</strong><time className="text-xs text-muted-foreground" dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time></div>
          <p className="break-all text-xs text-muted-foreground">{row.editor_email}</p>
          {auditDetails(row.detalhes).map((text, i) => <p key={i} className="mt-1 break-words text-xs">{text}</p>)}
        </li>)}
      </ol>}
      {(query.data?.length ?? 0) > limit && <Button variant="ghost" size="sm" onClick={() => setLimit(limit + 20)}>Ver registros anteriores</Button>}
    </div>}
  </section>;
}