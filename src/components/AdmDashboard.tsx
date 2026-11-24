import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { Calendar, Filter, X, LayoutDashboard, Car, Plane, Headset, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPeriodoOptions, getPeriodoIndices, type PeriodoId } from "@/lib/dashboard-analytics";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { admMonths, computeAdmExecutive, computeAdmYear, type AdmComparison } from "@/lib/adm-analytics";
import { useAdmData, importAdm, exportAdm, MESES_ADM, SEGMENTOS_ADM, ANOS_ADM } from "@/lib/adm-store";

const GREEN = "#007A4D", GREEN_80 = "#3BA27E", GREEN_60 = "#5CAF8F", GREEN_45 = "#87C3A9", GREEN_MARK = "#4E7F71";
const YELLOW = "#EAA921", YELLOW_80 = "#F2B844", YELLOW_65 = "#F8C66B", YELLOW_45 = "#FFD796", GRAY = "#B6B6B6";
const SEG_COLORS: Record<string, string> = { AMBIENTAL: GREEN, BUNKER: YELLOW, OFFSHORE: GREEN_80, ESTALEIRO: YELLOW_80, CORPORATIVO: GRAY };
const PALETTE = [GREEN, YELLOW, GREEN_80, YELLOW_80, GREEN_60, YELLOW_65, GREEN_45, YELLOW_45, GREEN_MARK, GRAY];
const tip = { backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 };
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const kfmt = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v)));
const xMes = { dataKey: "mes", tick: { fontSize: 11 }, interval: 0 as const };

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-4 shadow-sm ${className}`}>
      <div className="mb-3 border-l-4 border-primary pl-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-72 w-full">{children}</div>
    </div>
  );
}
function Delta({ c, fmt, prev, goodDown = true, pp }: { c?: AdmComparison; fmt: (n: number) => string; prev: string | null; goodDown?: boolean; pp?: boolean }) {
  if (!c || c.delta === null || !prev) return <div className="mt-1 text-[11px] text-muted-foreground">Sem comparação com mês anterior</div>;
  const up = c.delta > 0, flat = c.delta === 0;
  const good = flat ? null : goodDown ? !up : up;
  const cls = good === null ? "bg-muted text-muted-foreground" : good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800";
  const txt = pp ? `${up ? "+" : ""}${c.delta.toFixed(1)} p.p.` : `${up ? "+" : flat ? "" : "−"}${fmt(Math.abs(c.delta))}${c.percent !== null ? ` (${up ? "+" : ""}${c.percent.toFixed(1)}%)` : ""}`;
  return <div className="mt-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{flat ? "Estável" : (up ? "▲ " : "▼ ") + txt} vs {prev}</span></div>;
}
function KPI({ label, value, accent = GREEN, children }: { label: string; value: string | number; accent?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm min-w-0">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight" style={{ color: accent }}>{value}</div>
      {children}
    </div>
  );
}

export function AdmDashboard({ ano, setAno, header }: { ano: string; setAno: (a: string) => void; header: React.ReactNode }) {
  const { data, save, reset } = useAdmData(ano);
  const [seg, setSeg] = useState("TODOS");
  const [periodo, setPeriodo] = useState<PeriodoId>("ANO");
  const [tab, setTab] = useState("visao-executiva");
  const periodoOptions = useMemo(() => getPeriodoOptions(MESES_ADM), []);
  const periodoAtual = periodoOptions.find((p) => p.id === periodo) ?? periodoOptions[0]!;
  const mesesPeriodo = useMemo(() => new Set(getPeriodoIndices(MESES_ADM, periodo).map((i) => MESES_ADM[i])), [periodo]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const segList = seg === "TODOS" ? SEGMENTOS_ADM : [seg];
  const sub = `${seg === "TODOS" ? "Todos os segmentos" : seg} • ${periodoAtual.shortLabel}`;
  const uber = useMemo(() => data.uber.filter((r) => segList.includes(r.segmento) && mesesPeriodo.has(r.mes)), [data, seg, mesesPeriodo]);
  const via = useMemo(() => data.viagens.filter((r) => segList.includes(r.segmento) && mesesPeriodo.has(r.mes)), [data, seg, mesesPeriodo]);
  const chamadosRows = useMemo(() => data.chamados.filter((r) => mesesPeriodo.has(r.mes)), [data, mesesPeriodo]);
  const mesesAtivos = useMemo(() => {
    const s = new Set([...data.uber, ...data.viagens, ...data.chamados].map((r) => r.mes));
    const last = Math.max(-1, ...[...s].map((m) => MESES_ADM.indexOf(m)));
    return MESES_ADM.slice(0, Math.max(last + 1, 1)).filter((m) => mesesPeriodo.has(m));
  }, [data, mesesPeriodo]);

  const bySegMes = (rows: { mes: string; segmento: string }[], val: (r: never) => number) =>
    mesesAtivos.map((mes) => {
      const o: Record<string, string | number> = { mes };
      segList.forEach((s) => (o[s] = +rows.filter((r) => r.mes === mes && r.segmento === s).reduce((a, r) => a + val(r as never), 0).toFixed(2)));
      return o;
    });
  const sumBy = <T,>(rows: T[], k: (r: T) => string, v: (r: T) => number) => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(k(r), (m.get(k(r)) ?? 0) + v(r)));
    return [...m.entries()].map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);
  };

  const uberValorMes = bySegMes(uber, (r: { valor: number }) => r.valor);
  const uberCorridasMes = bySegMes(uber, (r: { corridas: number }) => r.corridas);
  const viaValorMes = bySegMes(via, (r: { valor: number }) => r.valor);
  const uberServico = sumBy(uber, (r) => r.servico, (r) => r.valor).slice(0, 8);
  const uberSeg = sumBy(uber, (r) => r.segmento, (r) => r.valor);
  const viaProduto = sumBy(via, (r) => r.produto, (r) => r.valor).slice(0, 5);
  const viaSeg = sumBy(via, (r) => r.segmento, (r) => r.valor);
  const topProdutos = viaProduto.slice(0, 5).map((p) => p.name);
  const viaProdMes = mesesAtivos.map((mes) => {
    const o: Record<string, string | number> = { mes };
    topProdutos.forEach((p) => (o[p] = +via.filter((r) => r.mes === mes && r.produto === p).reduce((a, r) => a + r.valor, 0).toFixed(2)));
    return o;
  });
  const ticket = mesesAtivos.map((mes) => {
    const rs = uber.filter((r) => r.mes === mes);
    const v = rs.reduce((a, r) => a + r.valor, 0), c = rs.reduce((a, r) => a + r.corridas, 0);
    return { mes, ticket: c ? +(v / c).toFixed(2) : 0 };
  });
  const chamados = mesesAtivos.map((mes) => {
    const c = chamadosRows.find((x) => x.mes === mes);
    return { mes, Solucionados: c?.solucionados ?? 0, Total: c?.total ?? 0, "% Resolução": c && c.total ? +((c.solucionados / c.total) * 100).toFixed(1) : 0 };
  });

  const meses = admMonths(data);
  const [mesSel, setMesSel] = useState<string>("ANO");
  const mesPer = periodo.startsWith("M:") ? periodo.slice(2) : "";
  const modoAno = !meses.includes(mesPer) && !meses.includes(mesSel);
  const mesRef = meses.includes(mesPer) ? mesPer : meses.includes(mesSel) ? mesSel : meses[meses.length - 1] ?? "";
  const anoExec = useMemo(() => computeAdmYear(data, seg), [data, seg]);
  const exec = useMemo(() => (mesRef ? computeAdmExecutive(data, seg, mesRef) : null), [data, seg, mesRef]);
  const cmp = exec?.comparisons, prev = exec?.previousMonth ?? null;
  const num = (n: number) => Math.round(n).toLocaleString("pt-BR");

  const totUber = uber.reduce((a, r) => a + r.valor, 0);
  const totCorr = uber.reduce((a, r) => a + r.corridas, 0);
  const totVia = via.reduce((a, r) => a + r.valor, 0);
  const totQtdDetalhada = via.reduce((a, r) => a + (r.quantidade ?? 0), 0);
  const totalAnualQtd = data.quantidadeViagensTotal;
  const totQtd = periodo === "ANO" && seg === "TODOS" && totalAnualQtd !== null ? totalAnualQtd : totQtdDetalhada;
  const totCh = chamadosRows.reduce((a, r) => a + r.total, 0);
  const totSol = chamadosRows.reduce((a, r) => a + r.solucionados, 0);

  const handleImport = async (f: File) => {
    setBusy(true); setMsg(null);
    try { save(await importAdm(f)); setMsg("Planilha base importada com sucesso."); }
    catch (e) { setMsg("Erro ao importar: " + (e instanceof Error ? e.message : String(e))); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const segBars = (rows: Record<string, string | number>[], money: boolean) => (
    <ResponsiveContainer>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis {...xMes} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={money ? kfmt : undefined} />
        <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} formatter={(v: number) => (money ? brl(v) : v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {segList.map((s) => <Bar key={s} dataKey={s} stackId="a" fill={SEG_COLORS[s]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
  const pie = (rows: { name: string; value: number }[], seg?: boolean) => (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={45} outerRadius={90} paddingAngle={2}>
          {rows.map((r, i) => <Cell key={r.name} fill={(seg && SEG_COLORS[r.name]) || PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} formatter={(v: number) => brl(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md" style={{ background: `linear-gradient(135deg, ${GREEN} 50%, ${YELLOW} 50%)` }} />
            <div>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Dashboard Administrativo • {ano}</h1>
              <p className="text-xs text-muted-foreground">Uber, viagens e chamados por mês e segmento</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {header}
                <span className="mx-1 w-px bg-border" />
                {ANOS_ADM.map((a) => (
                  <button key={a} onClick={() => setAno(a)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${ano === a ? "bg-accent text-accent-foreground" : "border bg-white text-muted-foreground hover:bg-muted"}`}>{a}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
            <button onClick={() => exportAdm(data, `base-administrativo-${ano}.xlsx`)}
              className="rounded-md border border-primary bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm hover:bg-primary/5">Baixar planilha base</button>
            <button onClick={() => fileRef.current?.click()} disabled={busy}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50">{busy ? "Importando..." : "Importar planilha base"}</button>
            <button onClick={() => { if (confirm("Restaurar dados iniciais?")) { reset(); setMsg("Dados restaurados."); } }}
              className="rounded-md border bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-sm hover:bg-muted">Restaurar</button>
          </div>
        </div>
        {msg && <div className="mx-auto max-w-[1400px] px-4 pb-3 text-xs text-muted-foreground">{msg}</div>}
      </header>

      <div className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <label htmlFor="adm-periodo" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Período</label>
              <select id="adm-periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoId)}
                className="rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary">
                <optgroup label="Visão Anual e Semestral">{periodoOptions.filter((o) => o.group === "visao" || o.group === "semestre").map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>
                <optgroup label="Trimestres">{periodoOptions.filter((o) => o.group === "trimestre").map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>
                <optgroup label="Mês Específico">{periodoOptions.filter((o) => o.group === "mes").map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <label htmlFor="adm-segmento" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Segmento</label>
              <select id="adm-segmento" value={seg} onChange={(e) => setSeg(e.target.value)}
                className="rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="TODOS">Todos os segmentos</option>
                {SEGMENTOS_ADM.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {(periodo !== "ANO" || seg !== "TODOS") && (
              <div className="flex flex-wrap items-center gap-1.5 border-l pl-3">
                {periodo !== "ANO" && <button type="button" onClick={() => setPeriodo("ANO")} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20">{periodoAtual.shortLabel}<X className="h-3 w-3" /></button>}
                {seg !== "TODOS" && <button type="button" onClick={() => setSeg("TODOS")} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200">{seg}<X className="h-3 w-3" /></button>}
                <button type="button" onClick={() => { setPeriodo("ANO"); setSeg("TODOS"); }} className="text-xs font-medium text-muted-foreground underline hover:text-foreground">Limpar filtros</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto min-w-max flex-wrap justify-start gap-1 rounded-xl bg-muted/80 p-1.5">
              <TabsTrigger value="visao-executiva" className="gap-1.5 py-1.5 text-xs sm:text-sm"><LayoutDashboard className="h-4 w-4" />Visão Executiva</TabsTrigger>
              <TabsTrigger value="uber" className="gap-1.5 py-1.5 text-xs sm:text-sm"><Car className="h-4 w-4" />Uber</TabsTrigger>
              <TabsTrigger value="viagens" className="gap-1.5 py-1.5 text-xs sm:text-sm"><Plane className="h-4 w-4" />Viagens</TabsTrigger>
              <TabsTrigger value="chamados" className="gap-1.5 py-1.5 text-xs sm:text-sm"><Headset className="h-4 w-4" />Chamados</TabsTrigger>
              <TabsTrigger value="visao-completa" className="gap-1.5 py-1.5 text-xs sm:text-sm"><Layers className="h-4 w-4" />Visão Completa</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="visao-executiva" className="space-y-6">
        {exec && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Destaques</span>
              <select value={modoAno ? "ANO" : mesRef} onChange={(e) => setMesSel(e.target.value)} className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium shadow-sm">
                <option value="ANO">Ano completo</option>
                {meses.map((m) => <option key={m} value={m}>Comparar {m} x mês anterior</option>)}
              </select>
              <span className="text-xs text-muted-foreground">{modoAno ? `${anoExec.first ?? ""} a ${anoExec.last ?? ""} (último mês com dados)` : prev ? `${mesRef} comparado com ${prev}` : "sem mês anterior para comparar"} • {seg === "TODOS" ? "Todos os segmentos" : seg}</span>
            </div>
            <InsightsPanel insights={modoAno ? anoExec.insights : exec.insights} periodoLabel={modoAno ? `Ano ${ano} (${anoExec.first ?? ""}–${anoExec.last ?? ""})` : `${mesRef}/${ano}`} />
            {!modoAno && <div className="space-y-4">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <KPI label={`Chamados Administrativos • ${mesRef}`} value={cmp?.chamados.current != null ? num(cmp.chamados.current) : "—"}><Delta c={cmp?.chamados} fmt={num} prev={prev} goodDown={false} /></KPI>
                <KPI label={`Taxa de Resolução • ${mesRef}`} value={cmp?.resolucao.current != null ? `${cmp.resolucao.current.toFixed(1)}%` : "—"} accent={YELLOW}><Delta c={cmp?.resolucao} fmt={num} prev={prev} goodDown={false} pp /></KPI>
              </section>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KPI label={`Custo Uber • ${mesRef}`} value={cmp?.uber.current != null ? brl(cmp.uber.current) : "—"}><Delta c={cmp?.uber} fmt={brl} prev={prev} /></KPI>
                <KPI label={`Corridas Uber • ${mesRef}`} value={cmp?.corridas.current != null ? num(cmp.corridas.current) : "—"} accent={YELLOW}><Delta c={cmp?.corridas} fmt={num} prev={prev} /></KPI>
                <KPI label={`Ticket Médio Uber • ${mesRef}`} value={cmp?.ticket.current != null ? brl(cmp.ticket.current) : "—"}><Delta c={cmp?.ticket} fmt={brl} prev={prev} /></KPI>
              </section>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KPI label={`Custo Viagens • ${mesRef}`} value={cmp?.viagens.current != null ? brl(cmp.viagens.current) : "—"} accent={YELLOW}><Delta c={cmp?.viagens} fmt={brl} prev={prev} /></KPI>
                <KPI label={`Quantidade de Viagens • ${mesRef}`} value={cmp?.qtdViagens.current != null ? num(cmp.qtdViagens.current) : "—"}>{cmp?.qtdViagens.current != null ? <Delta c={cmp?.qtdViagens} fmt={num} prev={prev} /> : <div className="mt-1 text-[11px] text-muted-foreground">Preencha na planilha base</div>}</KPI>
                <KPI label={`Ticket Médio Viagens • ${mesRef}`} value={cmp?.ticketViagens.current != null ? brl(cmp.ticketViagens.current) : "—"} accent={YELLOW}>{cmp?.ticketViagens.current != null ? <Delta c={cmp?.ticketViagens} fmt={brl} prev={prev} /> : <div className="mt-1 text-[11px] text-muted-foreground">Depende da quantidade de viagens</div>}</KPI>
              </section>
            </div>}
            <h2 className="pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Acumulado • {periodoAtual.shortLabel}</h2>
          </>
        )}
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KPI label="Chamados Administrativos" value={totCh.toLocaleString("pt-BR")} />
            <KPI label="Taxa de Resolução" value={`${totCh ? ((totSol / totCh) * 100).toFixed(1) : 0}%`} accent={YELLOW} />
          </section>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPI label="Custo Uber" value={brl(totUber)} />
            <KPI label="Corridas Uber" value={totCorr.toLocaleString("pt-BR")} accent={YELLOW} />
            <KPI label="Ticket Médio Uber" value={brl(totCorr ? totUber / totCorr : 0)} />
          </section>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPI label="Custo Viagens" value={brl(totVia)} accent={YELLOW} />
            <KPI label="Quantidade de Viagens" value={totQtd ? totQtd.toLocaleString("pt-BR") : "—"} />
            <KPI label="Ticket Médio Viagens" value={totQtd ? brl(totVia / totQtd) : "—"} accent={YELLOW} />
          </section>
        </div>

          </TabsContent>
          <TabsContent value="uber" className="space-y-6">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Custo Uber por Mês" subtitle={sub}>{segBars(uberValorMes, true)}</Card>
          <Card title="Corridas Uber por Mês" subtitle={sub}>{segBars(uberCorridasMes, false)}</Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Uber por Segmento" subtitle="Valor acumulado">{pie(uberSeg, true)}</Card>
          <Card title="Uber por Tipo de Serviço" subtitle={sub}>
            <ResponsiveContainer>
              <BarChart data={uberServico} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={kfmt} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} formatter={(v: number) => brl(v)} />
                <Bar dataKey="value" name="Valor" fill={GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Ticket Médio Uber" subtitle={sub}>
            <ResponsiveContainer>
              <LineChart data={ticket}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis {...xMes} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} formatter={(v: number) => brl(v)} />
                <Line type="monotone" dataKey="ticket" name="Ticket médio" stroke={YELLOW} strokeWidth={3} dot={{ fill: GREEN, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

          </TabsContent>
          <TabsContent value="viagens" className="space-y-6">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Custo com Viagens por Mês" subtitle={sub}>{segBars(viaValorMes, true)}</Card>
          <Card title="Viagens por Produto (Top 5)" subtitle={sub}>
            <ResponsiveContainer>
              <LineChart data={viaProdMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis {...xMes} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={kfmt} />
                <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} formatter={(v: number) => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {topProdutos.map((p, i) => <Line key={p} type="monotone" dataKey={p} stroke={PALETTE[i]} strokeWidth={2} dot={{ r: 3 }} />)}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Viagens por Segmento" subtitle="Valor acumulado">{pie(viaSeg, true)}</Card>
          <Card title="Viagens por Produto" subtitle={sub} className="lg:col-span-2">
            <ResponsiveContainer>
              <BarChart data={viaProduto} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={kfmt} />
                <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} formatter={(v: number) => brl(v)} />
                <Bar dataKey="value" name="Valor" fill={YELLOW} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

          </TabsContent>
          <TabsContent value="chamados" className="space-y-6">
        <section>
          <Card title="CHAMADO DO ADMINISTRATIVO - SOLUCIONADOS X TOTAL" subtitle={`Todos os segmentos (sem divisão por segmento na planilha) • ${periodoAtual.shortLabel}`}>
            <ResponsiveContainer>
              <ComposedChart data={chamados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis {...xMes} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" domain={[80, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="Total" fill={GREEN} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="l" dataKey="Solucionados" fill={YELLOW} radius={[4, 4, 0, 0]} />
                <Line yAxisId="r" type="monotone" dataKey="% Resolução" stroke={GREEN_MARK} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </section>

          </TabsContent>
          <TabsContent value="visao-completa" className="space-y-6">
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KPI label="Chamados Administrativos" value={totCh.toLocaleString("pt-BR")} />
            <KPI label="Taxa de Resolução" value={`${totCh ? ((totSol / totCh) * 100).toFixed(1) : 0}%`} accent={YELLOW} />
          </section>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPI label="Custo Uber" value={brl(totUber)} />
            <KPI label="Corridas Uber" value={totCorr.toLocaleString("pt-BR")} accent={YELLOW} />
            <KPI label="Ticket Médio Uber" value={brl(totCorr ? totUber / totCorr : 0)} />
          </section>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPI label="Custo Viagens" value={brl(totVia)} accent={YELLOW} />
            <KPI label="Quantidade de Viagens" value={totQtd ? totQtd.toLocaleString("pt-BR") : "—"} />
            <KPI label="Ticket Médio Viagens" value={totQtd ? brl(totVia / totQtd) : "—"} accent={YELLOW} />
          </section>
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Custo Uber por Mês" subtitle={sub}>{segBars(uberValorMes, true)}</Card>
          <Card title="Corridas Uber por Mês" subtitle={sub}>{segBars(uberCorridasMes, false)}</Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Uber por Segmento" subtitle="Valor acumulado">{pie(uberSeg, true)}</Card>
          <Card title="Uber por Tipo de Serviço" subtitle={sub}>
            <ResponsiveContainer>
              <BarChart data={uberServico} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={kfmt} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} formatter={(v: number) => brl(v)} />
                <Bar dataKey="value" name="Valor" fill={GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Ticket Médio Uber" subtitle={sub}>
            <ResponsiveContainer>
              <LineChart data={ticket}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis {...xMes} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} formatter={(v: number) => brl(v)} />
                <Line type="monotone" dataKey="ticket" name="Ticket médio" stroke={YELLOW} strokeWidth={3} dot={{ fill: GREEN, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Custo com Viagens por Mês" subtitle={sub}>{segBars(viaValorMes, true)}</Card>
          <Card title="Viagens por Produto (Top 5)" subtitle={sub}>
            <ResponsiveContainer>
              <LineChart data={viaProdMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis {...xMes} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={kfmt} />
                <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} formatter={(v: number) => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {topProdutos.map((p, i) => <Line key={p} type="monotone" dataKey={p} stroke={PALETTE[i]} strokeWidth={2} dot={{ r: 3 }} />)}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Viagens por Segmento" subtitle="Valor acumulado">{pie(viaSeg, true)}</Card>
          <Card title="Viagens por Produto" subtitle={sub} className="lg:col-span-2">
            <ResponsiveContainer>
              <BarChart data={viaProduto} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={kfmt} />
                <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} formatter={(v: number) => brl(v)} />
                <Bar dataKey="value" name="Valor" fill={YELLOW} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <section>
          <Card title="CHAMADO DO ADMINISTRATIVO - SOLUCIONADOS X TOTAL" subtitle={`Todos os segmentos (sem divisão por segmento na planilha) • ${periodoAtual.shortLabel}`}>
            <ResponsiveContainer>
              <ComposedChart data={chamados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis {...xMes} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" domain={[80, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip itemSorter={(i) => -Number(i.value ?? 0)} contentStyle={tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="Total" fill={GREEN} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="l" dataKey="Solucionados" fill={YELLOW} radius={[4, 4, 0, 0]} />
                <Line yAxisId="r" type="monotone" dataKey="% Resolução" stroke={GREEN_MARK} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </section>

          </TabsContent>
        </Tabs>

        <footer className="pt-4 text-center text-xs text-muted-foreground">Setor Administrativo • Ano {ano} • Cores da marca Bravante</footer>
      </main>
    </div>
  );
}
