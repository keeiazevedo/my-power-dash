import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEditor } from "@/hooks/use-editor";
import { abrirAnexo, buscarAnexo, removerAnexo } from "@/lib/anexos.functions";

const BUCKET = "checklists-anexos";
const ACEITOS = ["application/pdf", "image/png", "image/jpeg"];
const limpa = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);

export function RequisitoAnexo({ chave, label }: { chave: string; label: string }) {
  const { isEditor } = useEditor();
  const pasta = limpa(chave);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    const r = await buscarAnexo({ data: { pasta } }).catch(() => null);
    setArquivo(r?.path ?? null);
  };
  useEffect(() => { carregar(); }, [pasta]);

  const nome = arquivo ? arquivo.split("/").pop()!.replace(/^\d+-/, "") : "";

  const enviar = async (f?: File) => {
    if (!f) return;
    if (!ACEITOS.includes(f.type)) { alert("Envie um arquivo PDF, PNG ou JPEG."); return; }
    setOcupado(true);
    const { error } = await supabase.storage.from(BUCKET).upload(`${pasta}/${Date.now()}-${limpa(f.name)}`, f, { contentType: f.type });
    if (error) alert("Não foi possível enviar o anexo. Tente novamente.");
    else if (arquivo) await removerAnexo({ data: { path: arquivo } });
    await carregar();
    setOcupado(false);
  };
  const abrir = async () => {
    if (!arquivo) return;
    const w = window.open("", "_blank");
    const { url } = await abrirAnexo({ data: { path: arquivo } });
    if (url && w) w.location.href = url; else w?.close();
  };
  const remover = async () => {
    if (!arquivo || !confirm(`Remover o anexo de ${label}?`)) return;
    setOcupado(true);
    await removerAnexo({ data: { path: arquivo } });
    await carregar();
    setOcupado(false);
  };

  return (
    <div className="flex items-center gap-1">
      <input ref={input} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" aria-label={`Anexo de ${label}`} onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = ""; }} />
      {ocupado ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : arquivo ? (
        <>
          <button type="button" onClick={abrir} title={nome} className="flex max-w-[140px] items-center gap-1 truncate rounded-md border px-2 py-1 text-xs font-medium text-primary hover:bg-muted">
            <Paperclip className="h-3 w-3 shrink-0" /><span className="truncate">{nome}</span>
          </button>
          {isEditor && <button type="button" onClick={remover} aria-label={`Remover anexo de ${label}`} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
        </>
      ) : !isEditor ? <span className="text-xs text-muted-foreground">—</span> : (
        <button type="button" onClick={() => input.current?.click()} className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
          <Paperclip className="h-3 w-3" />Anexar
        </button>
      )}
    </div>
  );
}
