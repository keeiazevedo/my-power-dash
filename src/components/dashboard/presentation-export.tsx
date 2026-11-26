import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { baseDataFor, type DashboardData } from '@/lib/dashboard-store';
import { baseAdm, type AdmData } from '@/lib/adm-store';
import { supabase } from '@/integrations/supabase/client';
import { getPeriodoOptions, type PeriodoId } from '@/lib/dashboard-analytics';
import { presentationValues } from '@/lib/presentation-data';
import { deliverFile } from '@/lib/download-file';
import template from '@/assets/resultados-bravante.pptx.asset.json';

type Props = { ano: string; periodo: PeriodoId; segment: string } &
  ({ sector: 'SAUDE'; data: DashboardData } | { sector: 'ADMINISTRATIVO'; data: AdmData });

export function PresentationExport(props: Props) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodoId>(props.periodo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<Blob | null>(null);
  const companion = useQuery({
    queryKey: ['presentation-companion', props.sector, props.ano], enabled: open,
    queryFn: async () => {
      const key = props.sector === 'SAUDE' ? `dashboard-adm-${props.ano}` : `dashboard-SAUDE-${props.ano}`;
      const { data, error } = await supabase.from('dashboard_dados').select('dados').eq('chave', key).maybeSingle();
      if (error) throw error;
      return props.sector === 'SAUDE'
        ? { health: null, adm: data ? data.dados as unknown as AdmData : Number(props.ano) >= 2026 ? baseAdm(props.ano) : { uber: [], viagens: [], chamados: [], quantidadeViagensTotal: null } }
        : { health: data ? data.dados as unknown as DashboardData : baseDataFor('SAUDE', props.ano), adm: null };
    },
    staleTime: 0,
  });
  useEffect(() => { setFile(null); setError(''); }, [period, props.data, props.ano, props.segment, companion.data]);
  const health = props.sector === 'SAUDE' ? props.data : companion.data?.health;
  const adm = props.sector === 'ADMINISTRATIVO' ? props.data : companion.data?.adm;
  const prepare = async () => {
    if (!health || !adm) return;
    setBusy(true); setError(''); setFile(null);
    try {
      const { values, empty } = presentationValues(health, adm, props.ano, period, props.segment);
      if (empty) throw new Error('Não há dados para o período selecionado.');
      const response = await fetch(template.url);
      if (!response.ok) throw new Error('Não foi possível carregar o modelo. Tente novamente.');
      const { fillPptxTemplate, PPTX_MIME_TYPE } = await import('@/lib/fill-pptx-template');
      const result = await fillPptxTemplate(await response.arrayBuffer(), values);
      if (result.unknownKeys.length) throw new Error(`Campos sem informação: ${result.unknownKeys.join(', ')}`);
      setFile(new Blob([result.bytes as BlobPart], { type: PPTX_MIME_TYPE }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gerar a apresentação.'); }
    finally { setBusy(false); }
  };
  return <>
    <Button variant="outline" className="text-xs font-semibold uppercase" onClick={() => { setPeriod(props.periodo); setFile(null); setOpen(true); }}><Presentation className="size-3.5" />PowerPoint</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Resultados • {props.ano}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Saúde e Administrativo • 2 slides • {props.segment === 'TODOS' ? 'Todos os segmentos' : props.segment}</p>
      <label className="grid gap-2 text-sm font-medium">Período da apresentação
        <select aria-label="Período da apresentação" className="h-10 w-full rounded-md border bg-background px-3" value={period} disabled={busy} onChange={e => setPeriod(e.target.value as PeriodoId)}>
          {getPeriodoOptions(health?.meses ?? baseDataFor('SAUDE', props.ano).meses).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      {companion.isPending && <p className="text-sm text-muted-foreground">Carregando bases atualizadas…</p>}
      {companion.isError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar as bases. <Button variant="ghost" size="sm" onClick={() => void companion.refetch()}>Tentar novamente</Button></p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {file ? <Button onClick={() => void deliverFile(file, `Resultados-Bravante-${props.ano}-${period.replace(':','-')}.pptx`)}><Download className="size-4" />Baixar PowerPoint</Button>
        : <Button disabled={busy || !health || !adm} onClick={() => void prepare()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Presentation className="size-4" />}{busy ? 'Preparando…' : 'Gerar apresentação'}</Button>}
    </DialogContent></Dialog>
  </>;
}