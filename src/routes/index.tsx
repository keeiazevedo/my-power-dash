import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ComposedChart,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import {
  useDashboardData,
  exportToExcel,
  importFromExcel,
  SETORES,
} from "@/lib/dashboard-store";

const ANOS = ["2025", "2026", "2027"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Saúde Ocupacional | Bravante" },
      { name: "description", content: "Painel de indicadores de saúde ocupacional: ASO, CAT, atendimentos, absenteísmo, afastamentos e qualidade de vida." },
      { property: "og:title", content: "Dashboard Saúde Ocupacional | Bravante" },
      { property: "og:description", content: "Painel de indicadores de saúde ocupacional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const GREEN = "#007A4D";
const GREEN_80 = "#3BA27E";
const GREEN_60 = "#5CAF8F";
const GREEN_45 = "#87C3A9";
const GREEN_MARK = "#4E7F71";
const YELLOW = "#EAA921";
const YELLOW_80 = "#F2B844";
const YELLOW_65 = "#F8C66B";
const YELLOW_45 = "#FFD796";
const GRAY = "#B6B6B6";

const SEG_COLORS: Record<string, string> = {
  AMBIENTAL: GREEN,
  BUNKER: YELLOW,
  OFFSHORE: GREEN_80,
  ESTALEIRO: YELLOW_80,
  CORPORATIVO: GRAY,
};

const STATUS_COLORS: Record<string, string> = {
  LIMBO: YELLOW,
  ATIVO: GREEN,
  ENCERRADO: GREEN_MARK,
  "EM ANÁLISE": YELLOW_80,
  APOSENTADO: GRAY,
};

const PIE_COLORS = [GREEN, YELLOW, GREEN_80, YELLOW_80, GRAY];

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
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 12,
};

function DashboardPage() {
  const [setor, setSetor] = useState<string>("SAUDE");
  const [ano, setAno] = useState<string>("2025");
  const { data, save, reset } = useDashboardData(setor, ano);
  const setorLabel = SETORES.find((s) => s.id === setor)?.label ?? setor;
  const [seg, setSeg] = useState<string>("TODOS");
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalCat = useMemo(() => data.catPorMes.reduce((s, r) => s + r.quantidade, 0), [data]);
  const totalAtendEnf = useMemo(
    () => data.atendimentosEnfermagem.reduce((s, r) => s + r.TOTAL, 0), [data]);
  const totalMerp = useMemo(() => data.atendimentosMerp.reduce((s, r) => s + r.quantidade, 0), [data]);
  const totalNaoContr = useMemo(() => data.recomendacaoNaoContratacao.reduce((s, r) => s + r.quantidade, 0), [data]);
  const totalAsoPrev = useMemo(() => data.asoPeriodicoPrevReal.reduce((s, r) => s + r.PREVISTOS, 0), [data]);
  const totalAsoReal = useMemo(() => data.asoPeriodicoPrevReal.reduce((s, r) => s + r.REALIZADOS, 0), [data]);

  const segAtivo = seg !== "TODOS" && data.segmentos.includes(seg) ? seg : "TODOS";
  const segList = segAtivo === "TODOS" ? data.segmentos : [segAtivo];
  const segSubtitle = segAtivo === "TODOS" ? "Todos os segmentos" : segAtivo;

  const catSegFiltrado = useMemo(
    () => (segAtivo === "TODOS" ? data.catPorSegmento : data.catPorSegmento.filter((r) => r.segmento === segAtivo)),
    [segAtivo, data]);
  const catAnoFiltrado = useMemo(
    () => (segAtivo === "TODOS" ? data.catPorAno : data.catPorAno.filter((r) => r.segmento === segAtivo)),
    [segAtivo, data]);
  const catAnoKeys = useMemo(
    () => Object.keys(data.catPorAno[0] ?? {}).filter((k) => k !== "segmento").sort(),
    [data]);

  const handleImport = async (file: File) => {
    setImporting(true);
    setMsg(null);
    try {
      const next = await importFromExcel(file);
      save(next);
      setMsg("Dados importados com sucesso.");
    } catch (e) {
      setMsg("Erro ao importar: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md" style={{ background: `linear-gradient(135deg, ${GREEN} 50%, ${YELLOW} 50%)` }} />
              <div>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">Dashboard {setorLabel} • {ano}</h1>
                <p className="text-xs text-muted-foreground">Indicadores consolidados por mês e segmento</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {SETORES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSetor(s.id)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${setor === s.id ? "bg-primary text-primary-foreground" : "border bg-white text-muted-foreground hover:bg-muted"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <span className="mx-1 w-px bg-border" />
                  {ANOS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAno(a)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${ano === a ? "bg-accent text-accent-foreground" : "border bg-white text-muted-foreground hover:bg-muted"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
              }}
            />
            <button
              onClick={() => exportToExcel(data, `dashboard-${setor.toLowerCase()}-${ano}.xlsx`)}
              className="rounded-md border border-primary bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm hover:bg-primary/5"
            >
              Baixar template
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {importing ? "Importando..." : "Importar Excel"}
            </button>
            <button
              onClick={() => {
                if (confirm("Restaurar dados iniciais?")) {
                  reset();
                  setMsg("Dados restaurados.");
                }
              }}
              className="rounded-md border bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-sm hover:bg-muted"
            >
              Restaurar
            </button>
            <label className="ml-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Segmento</label>
            <select
              value={seg}
              onChange={(e) => setSeg(e.target.value)}
              className="rounded-md border bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="TODOS">Todos</option>
              {data.segmentos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {msg && (
          <div className="mx-auto max-w-[1400px] px-4 pb-3 text-xs text-muted-foreground">{msg}</div>
        )}
      </header>


      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KPI label="Total ASO Previsto" value={totalAsoPrev} />
          <KPI label="Total ASO Realizado" value={totalAsoReal} accent={YELLOW} />
          <KPI label="Não Contratação" value={totalNaoContr} />
          <KPI label="Total CAT" value={totalCat} accent={YELLOW} />
          <KPI label="Atend. Enfermagem" value={totalAtendEnf} />
          <KPI label="Atend. MERP" value={totalMerp} accent={YELLOW} />
        </section>

        {/* Row 1 */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="ASO Periódico - Previsto x Realizado" subtitle="Por mês">
            <ResponsiveContainer>
              <BarChart data={data.asoPeriodicoPrevReal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="PREVISTOS" fill={GREEN} radius={[4, 4, 0, 0]} />
                <Bar dataKey="REALIZADOS" fill={YELLOW} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Alterações no ASO por Especialidade" subtitle="Admissional x Periódico">
            <ResponsiveContainer>
              <BarChart data={data.alteracoesAso} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="especialidade" tick={{ fontSize: 11 }} width={120} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ADMISSIONAL" fill={GREEN} radius={[0, 4, 4, 0]} />
                <Bar dataKey="PERIODICO" fill={YELLOW} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Row 2 */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Recomendação de Não Contratação (ASO)" subtitle="Por mês">
            <ResponsiveContainer>
              <AreaChart data={data.recomendacaoNaoContratacao}>
                <defs>
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GREEN} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={GREEN} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="quantidade" stroke={GREEN} fill="url(#gradGreen)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="CAT por Mês" subtitle="Comunicações de acidente">
            <ResponsiveContainer>
              <BarChart data={data.catPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="quantidade" fill={YELLOW} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="CAT por Segmento" subtitle="Distribuição no ano">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={catSegFiltrado} dataKey="quantidade" nameKey="segmento" innerRadius={45} outerRadius={90} paddingAngle={2}>
                  {catSegFiltrado.map((r, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Row 3 - CAT consolidado */}
        <section>
          <Card title="CAT por Ano - Consolidado" subtitle="Com e sem afastamento, por segmento" className="!h-auto">
            <ResponsiveContainer>
              <BarChart data={catAnoFiltrado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="segmento" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {catAnoKeys.map((k) => {
                  const anosOrd = Array.from(new Set(catAnoKeys.map((x) => x.split(" ")[0])));
                  const idx = anosOrd.indexOf(k.split(" ")[0]);
                  const greens = [GREEN_45, GREEN_60, GREEN_80, GREEN];
                  const yellows = [YELLOW_45, YELLOW_65, YELLOW_80, YELLOW];
                  const pos = Math.max(0, greens.length - anosOrd.length + idx);
                  const fill = k.includes("c/") ? yellows[pos] : greens[pos];
                  return <Bar key={k} dataKey={k} fill={fill} />;
                })}
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Row 4 - Enfermagem + MERP */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Atendimentos de Enfermagem" subtitle="Diurno x Noturno x Total">
            <ResponsiveContainer>
              <ComposedChart data={data.atendimentosEnfermagem}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="DIURNO" stackId="a" fill={GREEN} />
                <Bar dataKey="NOTURNO" stackId="a" fill={YELLOW} />
                <Line type="monotone" dataKey="TOTAL" stroke={GREEN_MARK} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Atendimentos MERP" subtitle="Por mês">
            <ResponsiveContainer>
              <LineChart data={data.atendimentosMerp}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="quantidade" stroke={YELLOW} strokeWidth={3} dot={{ fill: GREEN, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Row 5 - Atestado + Absenteísmo (filtráveis) */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Atestados Médicos por Segmento" subtitle={seg === "TODOS" ? "Todos os segmentos" : seg}>
            <ResponsiveContainer>
              <BarChart data={atestadoFiltrado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {segList.map((s) => (
                  <Bar key={s} dataKey={s} stackId="a" fill={SEG_COLORS[s]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Taxa de Absenteísmo (%)" subtitle={seg === "TODOS" ? "Todos os segmentos" : seg}>
            <ResponsiveContainer>
              <LineChart data={absentFiltrado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(2)}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {segList.map((s) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={SEG_COLORS[s]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Row 6 - Afastamentos */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Afastamento INSS por Segmento" subtitle="Por mês">
            <ResponsiveContainer>
              <BarChart data={data.afastamentoInss}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {segList.map((s) => (
                  <Bar key={s} dataKey={s} stackId="a" fill={SEG_COLORS[s]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Afastamentos por Status" subtitle="Evolução mensal">
            <ResponsiveContainer>
              <AreaChart data={data.afastamentoStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {data.statusAfast.map((s) => (
                  <Area key={s} type="monotone" dataKey={s} stackId="1" stroke={STATUS_COLORS[s]} fill={STATUS_COLORS[s]} fillOpacity={0.75} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Row 7 - Limbo + Qualidade de Vida */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Limbo Previdenciário por Segmento" subtitle="Colaboradores no limbo por mês">
            <ResponsiveContainer>
              <AreaChart data={data.limboPrevidenciario}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {segList.map((s) => (
                  <Area key={s} type="monotone" dataKey={s} stackId="1" stroke={SEG_COLORS[s]} fill={SEG_COLORS[s]} fillOpacity={0.7} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <KPI label="Ações Previstas (ano)" value={data.qualidadeVidaResumo.previstaAno} />
              <KPI label="Ações Realizadas (ano)" value={data.qualidadeVidaResumo.realizadaAno} accent={YELLOW} />
              <KPI label="% Atendimento" value={`${(data.qualidadeVidaResumo.taxa * 100).toFixed(0)}%`} />
            </div>
            <Card title="Qualidade de Vida - Previsto x Realizado" subtitle="Por mês" className="!p-4">
              <ResponsiveContainer>
                <BarChart data={data.qualidadeVida}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="PREVISTA" fill={GREEN} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="REALIZADA" fill={YELLOW} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </section>

        <footer className="pt-4 text-center text-xs text-muted-foreground">
          Setor {setorLabel} • Ano {ano} • Cores da marca Bravante
        </footer>
      </main>
    </div>
  );
}
