import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
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
function KPI({ label, value, accent = GREEN }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm min-w-0">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight" style={{ color: accent }}>{value}</div>
    </div>
  );
}

export function AdmDashboard({ ano, setAno, header }: { ano: string; setAno: (a: string) => void; header: React.ReactNode }) {
  const { data, save, reset } = useAdmData(ano);
  const [seg, setSeg] = useState("TODOS");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const segList = seg === "TODOS" ? SEGMENTOS_ADM : [seg];
  const sub = seg === "TODOS" ? "Todos os segmentos" : seg;
  const uber = useMemo(() => data.uber.filter((r) => segList.includes(r.segmento)), [data, seg]);
  const via = useMemo(() => data.viagens.filter((r) => segList.includes(r.segmento)), [data, seg]);
  const mesesAtivos = useMemo(() => {
    const s = new Set([...data.uber, ...data.viagens, ...data.chamados].map((r) => r.mes));
    const last = Math.max(-1, ...[...s].map((m) => MESES_ADM.indexOf(m)));
    return MESES_ADM.slice(0, Math.max(last + 1, 1));
  }, [data]);

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
    const c = data.chamados.find((x) => x.mes === mes);
    return { mes, Solucionados: c?.solucionados ?? 0, Total: c?.total ?? 0, "% Resolução": c && c.total ? +((c.solucionados / c.total) * 100).toFixed(1) : 0 };
  });

  const totUber = uber.reduce((a, r) => a + r.valor, 0);
  const totCorr = uber.reduce((a, r) => a + r.corridas, 0);
  const totVia = via.reduce((a, r) => a + r.valor, 0);
  const totCh = data.chamados.reduce((a, r) => a + r.total, 0);
  const totSol = data.chamados.reduce((a, r) => a + r.solucionados, 0);

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
        <Tooltip contentStyle={tip} formatter={(v: number) => (money ? brl(v) : v)} />
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
        <Tooltip contentStyle={tip} formatter={(v: number) => brl(v)} />
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
            <label className="ml-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Segmento</label>
            <select value={seg} onChange={(e) => setSeg(e.target.value)}
              className="rounded-md border bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="TODOS">Todos</option>
              {SEGMENTOS_ADM.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {msg && <div className="mx-auto max-w-[1400px] px-4 pb-3 text-xs text-muted-foreground">{msg}</div>}
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KPI label="Gasto Uber" value={brl(totUber)} />
          <KPI label="Corridas Uber" value={totCorr.toLocaleString("pt-BR")} accent={YELLOW} />
          <KPI label="Ticket médio Uber" value={brl(totCorr ? totUber / totCorr : 0)} />
          <KPI label="Gasto Viagens" value={brl(totVia)} accent={YELLOW} />
          <KPI label="Chamados Administrativo" value={totCh.toLocaleString("pt-BR")} />
          <KPI label="% Resolução" value={`${totCh ? ((totSol / totCh) * 100).toFixed(1) : 0}%`} accent={YELLOW} />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Gasto Uber por Mês" subtitle={sub}>{segBars(uberValorMes, true)}</Card>
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
                <Tooltip contentStyle={tip} formatter={(v: number) => brl(v)} />
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
                <Tooltip contentStyle={tip} formatter={(v: number) => brl(v)} />
                <Line type="monotone" dataKey="ticket" name="Ticket médio" stroke={YELLOW} strokeWidth={3} dot={{ fill: GREEN, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Gasto com Viagens por Mês" subtitle={sub}>{segBars(viaValorMes, true)}</Card>
          <Card title="Viagens por Produto (Top 5)" subtitle={sub}>
            <ResponsiveContainer>
              <LineChart data={viaProdMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis {...xMes} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={kfmt} />
                <Tooltip contentStyle={tip} formatter={(v: number) => brl(v)} />
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
                <Tooltip contentStyle={tip} formatter={(v: number) => brl(v)} />
                <Bar dataKey="value" name="Valor" fill={YELLOW} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <section>
          <Card title="CHAMADO DO ADMINISTRATIVO - SOLUCIONADOS X TOTAL" subtitle="Todos os segmentos (sem divisão por segmento na planilha)">
            <ResponsiveContainer>
              <ComposedChart data={chamados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis {...xMes} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" domain={[80, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="Total" fill={GREEN} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="l" dataKey="Solucionados" fill={YELLOW} radius={[4, 4, 0, 0]} />
                <Line yAxisId="r" type="monotone" dataKey="% Resolução" stroke={GREEN_MARK} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <footer className="pt-4 text-center text-xs text-muted-foreground">Setor Administrativo • Ano {ano} • Cores da marca Bravante</footer>
      </main>
    </div>
  );
}
