import { useEffect, useRef, useState } from "react";
import { Paperclip, Trash2 } from "lucide-react";

type Anexo = { nome: string; tipo: string; blob: Blob };
const DB = "checklists-anexos";
const STORE = "anexos";

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const q = fn(d.transaction(STORE, mode).objectStore(STORE));
    q.onsuccess = () => res(q.result as T);
    q.onerror = () => rej(q.error);
  });
}

const ACEITOS = ["application/pdf", "image/png", "image/jpeg"];

export function RequisitoAnexo({ chave, label }: { chave: string; label: string }) {
  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { tx<Anexo | undefined>("readonly", (s) => s.get(chave)).then((a) => setAnexo(a ?? null)).catch(() => {}); }, [chave]);

  const enviar = async (f?: File) => {
    if (!f) return;
    if (!ACEITOS.includes(f.type)) { alert("Envie um arquivo PDF, PNG ou JPEG."); return; }
    const a = { nome: f.name, tipo: f.type, blob: f };
    await tx("readwrite", (s) => s.put(a, chave));
    setAnexo(a);
  };
  const abrir = () => { if (anexo) window.open(URL.createObjectURL(anexo.blob), "_blank"); };
  const remover = async () => { await tx("readwrite", (s) => s.delete(chave)); setAnexo(null); };

  return (
    <div className="flex items-center gap-1">
      <input ref={input} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" aria-label={`Anexo de ${label}`} onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = ""; }} />
      {anexo ? (
        <>
          <button type="button" onClick={abrir} title={anexo.nome} className="flex max-w-[140px] items-center gap-1 truncate rounded-md border px-2 py-1 text-xs font-medium text-primary hover:bg-muted">
            <Paperclip className="h-3 w-3 shrink-0" /><span className="truncate">{anexo.nome}</span>
          </button>
          <button type="button" onClick={remover} aria-label={`Remover anexo de ${label}`} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
        </>
      ) : (
        <button type="button" onClick={() => input.current?.click()} className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
          <Paperclip className="h-3 w-3" />Anexar
        </button>
      )}
    </div>
  );
}
