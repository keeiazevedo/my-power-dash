import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleSlash, ClipboardList } from "lucide-react";
import { RequisitoAnexo } from "./requisito-anexo";
import { EditorLogin } from "./editor-login";
import { useEditor } from "@/hooks/use-editor";
import { calcRequisito, fmtData, fromISO, toISO, STATUS_REQ, UNIDADES_REQ, UNIDADE_NOME, validadeLabel, type RequisitoRow, type RequisitoStatus } from "@/lib/adm-requisitos";

const STATUS_STYLE: Record<RequisitoStatus, { bar: string; badge: string }> = {
  "EM DIA": { bar: "#007A4D", badge: "bg-primary/15 text-primary" },
  "A VENCER": { bar: "#EAA921", badge: "bg-accent/25 text-foreground" },
  VENCIDO: { bar: "#B3261E", badge: "bg-destructive/15 text-destructive" },
  "SEM PROGRAMAÇÃO": { bar: "#B6B6B6", badge: "bg-muted text-muted-foreground" },
};
const LABEL: Record<RequisitoStatus, string> = { "EM DIA": "Em dia", "A VENCER": "A vencer", VENCIDO: "Vencido", "SEM PROGRAMAÇÃO": "Sem programação" };

export function RequisitosSection({ rows, onChange, compact, ano = "2026" }: { rows: RequisitoRow[]; onChange?: (rows: RequisitoRow[]) => void; compact?: boolean; ano?: string }) {
  const { isEditor } = useEditor();
  const ro = !isEditor || !onChange;
  const [unidade, setUnidade] = useState("TODAS");
  const [servico, setServico] = useState("TODOS");
  const [status, setStatus] = useState("TODOS");
  const all = useMemo(() => rows.map((r, idx) => ({ ...calcRequisito(r), idx })), [rows]);
  const edit = (idx: number, patch: Partial<RequisitoRow>) => !ro && onChange?.(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const inp = "h-8 w-full min-w-[7.5rem] rounded-md border bg-background px-2 text-sm";
  const servicos = useMemo(() => [...new Set(all.map((r) => r.servico))].sort(), [all]);
  const base = all.filter((r) => (unidade === "TODAS" || r.unidade === unidade) && (servico === "TODOS" || r.servico === servico));
  const count = (s: RequisitoStatus) => base.filter((r) => r.status === s).length;
  const lista = base.filter((r) => status === "TODOS" || r.status === status)
    .sort((a, b) => (a.dias ?? 1e9) - (b.dias ?? 1e9));
  const unidades = [...new Set([...UNIDADES_REQ, ...all.map((r) => r.unidade)])];
  const atencao = count("VENCIDO") + count("A VENCER") + count("SEM PROGRAMAÇÃO");

  if (!rows.length) return <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Nenhum check-list na planilha base. Preencha a aba "Check-lists Legais" e importe.</p>;

  const kpis = [
    { t: "Check-lists cadastrados", v: base.length, s: "Registros no filtro", i: ClipboardList, c: "text-foreground" },
    { t: "Em dia", v: count("EM DIA"), s: "Vencimento acima de 30 dias", i: CheckCircle2, c: "text-primary" },
    { t: "A vencer", v: count("A VENCER"), s: "Nos próximos 30 dias", i: CalendarClock, c: "text-[color:var(--chart-2,#EAA921)]" },
    { t: "Vencidos", v: count("VENCIDO"), s: "Precisam de atenção", i: AlertTriangle, c: "text-destructive" },
    { t: "Sem programação", v: count("SEM PROGRAMAÇÃO"), s: "Definir programação", i: CircleSlash, c: "text-muted-foreground" },
  ];
  const sel = "h-9 rounded-md border bg-background px-2 text-sm";

  return (
    <div className="space-y-6">
      {!compact && <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Unidade" className={sel} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
          <option value="TODAS">Todas as unidades</option>{unidades.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select aria-label="Serviço" className={sel} value={servico} onChange={(e) => setServico(e.target.value)}>
          <option value="TODOS">Todos os serviços</option>{servicos.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">Status calculado em {fmtData(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())))}</span>
      </div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.t} data-indicator={k.t} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k.t}<k.i className={`h-4 w-4 ${k.c}`} /></div>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${k.c}`}>{String(k.v).padStart(2, "0")}</p>
            <p className="text-xs text-muted-foreground">{k.s}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div data-indicator="Panorama por unidade" className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 border-l-4 border-primary pl-3"><h3 className="text-sm font-semibold uppercase tracking-wide">Panorama por unidade</h3><p className="text-xs text-muted-foreground">Conformidade dos prazos</p></div>
          <div className="space-y-3">
            {unidades.map((u) => {
              const rs = all.filter((r) => r.unidade === u && (servico === "TODOS" || r.servico === servico));
              if (!rs.length) return null;
              const ok = rs.filter((r) => r.status === "EM DIA").length;
              return (
                <div key={u}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span><b>{UNIDADE_NOME[u] ?? u}</b> <span className="text-xs text-muted-foreground">{rs.length} serviços • {rs.filter((r) => r.status === "SEM PROGRAMAÇÃO").length} sem programação</span></span>
                    <b className="tabular-nums">{Math.round((ok / rs.length) * 100)}% em dia</b>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                    {STATUS_REQ.map((s) => { const n = rs.filter((r) => r.status === s).length; return n ? <div key={s} title={`${LABEL[s]}: ${n}`} style={{ width: `${(n / rs.length) * 100}%`, background: STATUS_STYLE[s].bar }} /> : null; })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {STATUS_REQ.map((s) => <span key={s} className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_STYLE[s].bar }} />{LABEL[s]}</span>)}
          </div>
        </div>
        <div data-indicator="Radar de atenção" className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 border-l-4 border-accent pl-3"><h3 className="text-sm font-semibold uppercase tracking-wide">Radar de atenção</h3><p className="text-xs text-muted-foreground">{atencao} serviços para acompanhar</p></div>
          <ul className="space-y-2">
            {base.filter((r) => r.status === "VENCIDO" || r.status === "A VENCER").sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0)).map((r) => (
              <li key={r.servico + r.unidade} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <span><b>{r.servico}</b><br /><span className="text-xs text-muted-foreground">{r.unidade}</span></span>
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status].badge}`}>{r.dias! < 0 ? `${-r.dias!} dias em atraso` : `em ${r.dias} dias`}</span>
              </li>
            ))}
            {count("SEM PROGRAMAÇÃO") > 0 && <li className="text-xs text-muted-foreground">+ {count("SEM PROGRAMAÇÃO")} sem programação — revisar cadastros</li>}
          </ul>
        </div>
      </div>

      {!compact && <div data-indicator="Controle de check-lists" className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="border-l-4 border-primary pl-3"><h3 className="text-sm font-semibold uppercase tracking-wide">Controle de Check-lists ({lista.length})</h3><p className="text-xs text-muted-foreground">{ro ? "Somente leitura — entre na coluna Anexo para alterar" : "Edite aqui na tabela ou pela aba \"Check-lists Legais\" da planilha base"}</p></div>
<div className="flex flex-wrap items-center gap-2">          <select aria-label="Status" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="TODOS">Todos os status</option>{STATUS_REQ.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
          </select></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="p-2">Serviço</th><th className="p-2">Unidade</th><th className="p-2">Última execução</th><th className="p-2">Próximo vencimento</th><th className="p-2">Responsável</th><th className="p-2">Status</th><th className="p-2"><span className="flex items-center gap-2">Anexo<EditorLogin variant="linha" /></span></th></tr></thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.idx} className="border-b last:border-0">
                  <td className="p-2"><b>{r.servico}</b>{r.fornecedor && <span className="block text-xs text-muted-foreground">{r.fornecedor}</span>}</td>
                  <td className="p-2"><select disabled={ro} aria-label={`Unidade de ${r.servico}`} className={inp} value={r.unidade} onChange={(e) => edit(r.idx, { unidade: e.target.value })}>{unidades.map((u) => <option key={u} value={u}>{u}</option>)}</select></td>
                  <td className="p-2"><input type="date" disabled={ro} aria-label={`Última execução de ${r.servico}`} className={inp} value={toISO(r.ultimaExecucao)} onChange={(e) => edit(r.idx, { ultimaExecucao: fromISO(e.target.value), proximoVencimento: "" })} /><span className="block text-xs text-muted-foreground">{validadeLabel(r.validadeDias)}</span></td>
                  <td className="p-2"><input type="date" disabled={ro} aria-label={`Próximo vencimento de ${r.servico}`} className={`${inp} font-semibold`} value={r.vencimento ? r.vencimento.toISOString().slice(0, 10) : ""} onChange={(e) => edit(r.idx, { proximoVencimento: fromISO(e.target.value) })} /><span className="block text-xs text-muted-foreground">{r.dias === null ? "Definir programação" : r.dias < 0 ? `${-r.dias} dias em atraso` : `Em ${r.dias} dias`}</span></td>
                  <td className="p-2"><input disabled={ro} aria-label={`Responsável por ${r.servico}`} className={inp} value={r.responsavel} placeholder="—" onChange={(e) => edit(r.idx, { responsavel: e.target.value })} /></td>
                  <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status].badge}`}>{LABEL[r.status]}</span></td>
                  <td className="p-2"><RequisitoAnexo chave={`${r.servico}|${r.idx}`} label={r.servico} ano={ano} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}
