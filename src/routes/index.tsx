import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  BriefcaseMedical,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  HeartHandshake,
  Layers,
  LayoutDashboard,
  Printer,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
  Upload,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  useDashboardData,
  exportToExcel,
  importFromExcel,
  SETORES,
} from "@/lib/dashboard-store";
import {
  computeExecutiveKpis,
  computeInsights,
  filterDashboardByPeriodo,
  formatInt,
  formatPct,
  getPeriodoOptions,
  isDashboardEmpty,
  type PeriodoId,
} from "@/lib/dashboard-analytics";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { BrandTooltip, ChartCard } from "@/components/dashboard/chart-card";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ANOS = ["2025", "2026", "2027"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Saúde Ocupacional | Bravante" },
      {
        name: "description",
        content:
          "Painel de indicadores de saúde ocupacional: ASO, CAT, atendimentos, absenteísmo, afastamentos e qualidade de vida.",
      },
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

type TabValue =
  | "visao-executiva"
  | "aso-clinico"
  | "seguranca-cat"
  | "absenteismo-inss"
  | "qualidade-vida"
  | "visao-completa";

function DashboardPage() {
  const [setor, setSetor] = useState<string>("SAUDE");
  const [ano, setAno] = useState<string>("2025");
  const [periodo, setPeriodo] = useState<PeriodoId>("ANO");
  const [seg, setSeg] = useState<string>("TODOS");
  const [activeTab, setActiveTab] = useState<TabValue>("visao-executiva");
  const [importing, setImporting] = useState(false);

  const { data, save, reset } = useDashboardData(setor, ano);
  const fileRef = useRef<HTMLInputElement>(null);

  const setorLabel = SETORES.find((s) => s.id === setor)?.label ?? setor;
  const periodoOptions = useMemo(() => getPeriodoOptions(data.meses), [data.meses]);
  const periodoAtual =
    periodoOptions.find((p) => p.id === periodo) ?? periodoOptions[0];

  const segAtivo = seg !== "TODOS" && data.segmentos.includes(seg) ? seg : "TODOS";
  const segList = useMemo(
    () => (segAtivo === "TODOS" ? data.segmentos : [segAtivo]),
    [segAtivo, data.segmentos],
  );
  const segSubtitle = segAtivo === "TODOS" ? "Todos os segmentos" : segAtivo;
  const scopeEmpresaBadge = segAtivo !== "TODOS" ? "Consolidado Empresa" : undefined;

  const empty = useMemo(() => isDashboardEmpty(data), [data]);

  const filtered = useMemo(
    () => filterDashboardByPeriodo(data, periodoAtual.id, segList),
    [data, periodoAtual.id, segList],
  );

  const kpis = useMemo(
    () => computeExecutiveKpis(data, filtered, periodoAtual.id, segAtivo, segList),
    [data, filtered, periodoAtual.id, segAtivo, segList],
  );

  const insights = useMemo(
    () => computeInsights(data, filtered, kpis, segAtivo, segList),
    [data, filtered, kpis, segAtivo, segList],
  );

  const catSegFiltrado = useMemo(
    () =>
      segAtivo === "TODOS"
        ? data.catPorSegmento
        : data.catPorSegmento.filter((r) => r.segmento === segAtivo),
    [segAtivo, data.catPorSegmento],
  );

  const catAnoFiltrado = useMemo(
    () =>
      segAtivo === "TODOS"
        ? data.catPorAno
        : data.catPorAno.filter((r) => r.segmento === segAtivo),
    [segAtivo, data.catPorAno],
  );

  const catAnoKeys = useMemo(
    () =>
      Object.keys(data.catPorAno[0] ?? {})
        .filter((k) => k !== "segmento")
        .sort(),
    [data.catPorAno],
  );

  const hasActiveFilters = periodoAtual.id !== "ANO" || segAtivo !== "TODOS";

  const toggleSegFilter = (targetSeg: string) => {
    if (!targetSeg) return;
    setSeg((curr) => (curr === targetSeg ? "TODOS" : targetSeg));
  };

  const toggleMonthFilter = (mes: string) => {
    if (!mes) return;
    const target: PeriodoId = `M:${mes}`;
    setPeriodo((curr) => (curr === target ? "ANO" : target));
  };

  const handleExportTemplate = () => {
    const filename = `dashboard-${setor.toLowerCase()}-${ano}.xlsx`;
    exportToExcel(data, filename);
    toast.success(`Planilha ${filename} exportada com sucesso.`);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const next = await importFromExcel(file);
      save(next);
      toast.success(`Dados importados com sucesso para ${setorLabel} • ${ano}.`);
    } catch (e) {
      toast.error(
        "Erro ao importar planilha: " + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleReset = () => {
    reset();
    toast.info(`Dados de ${setorLabel} • ${ano} restaurados para o padrão inicial.`);
  };

  // ---------- Reusable Chart Blocks ----------
  const chartAsoPrevReal = (
    <ChartCard
      title="ASO Periódico - Previsto x Realizado"
      subtitle={`Evolução mensal • ${periodoAtual.shortLabel}`}
      badge={scopeEmpresaBadge ?? `${formatPct(kpis.asoTaxaPct, 0)} realizado`}
    >
      <ResponsiveContainer>
        <BarChart data={filtered.asoPeriodicoPrevReal}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="PREVISTOS"
            name="Previstos"
            fill={GREEN}
            radius={[4, 4, 0, 0]}
            className="cursor-pointer"
            onClick={(entry: { mes?: string; payload?: { mes?: string } }) => {
              const m = entry?.mes ?? entry?.payload?.mes;
              if (m) toggleMonthFilter(m);
            }}
          />
          <Bar
            dataKey="REALIZADOS"
            name="Realizados"
            fill={YELLOW}
            radius={[4, 4, 0, 0]}
            className="cursor-pointer"
            onClick={(entry: { mes?: string; payload?: { mes?: string } }) => {
              const m = entry?.mes ?? entry?.payload?.mes;
              if (m) toggleMonthFilter(m);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartAlteracoesAso = (
    <ChartCard
      title="Alterações no ASO por Especialidade"
      subtitle="Comparativo Admissional x Periódico (Acumulado Anual)"
      badge={scopeEmpresaBadge}
    >
      <ResponsiveContainer>
        <BarChart data={data.alteracoesAso} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="especialidade" tick={{ fontSize: 11 }} width={120} />
          <Tooltip content={<BrandTooltip showTotal />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="ADMISSIONAL" name="Admissional" fill={GREEN} radius={[0, 4, 4, 0]} />
          <Bar dataKey="PERIODICO" name="Periódico" fill={YELLOW} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartNaoContratacao = (
    <ChartCard
      title="Recomendação de Não Contratação (ASO)"
      subtitle={`Por mês • ${periodoAtual.shortLabel}`}
      badge={scopeEmpresaBadge ?? `Total: ${formatInt(kpis.totalNaoContratacao)}`}
    >
      <ResponsiveContainer>
        <AreaChart data={filtered.recomendacaoNaoContratacao}>
          <defs>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.7} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip />} />
          <Area
            type="monotone"
            dataKey="quantidade"
            name="Não Contratações"
            stroke={GREEN}
            fill="url(#gradGreen)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartCatMes = (
    <ChartCard
      title="CAT por Mês"
      subtitle="Comunicações de acidente • Clique na barra p/ focar mês"
      badge={
        scopeEmpresaBadge ??
        `Média: ${filtered.mediaCatMensal.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/mês`
      }
    >
      <ResponsiveContainer>
        <BarChart data={filtered.catPorMes}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip />} />
          {filtered.catPorMes.length > 1 && (
            <ReferenceLine
              y={filtered.mediaCatMensal}
              stroke={GREEN}
              strokeDasharray="4 4"
              label={{
                value: "Média",
                position: "insideTopRight",
                fontSize: 10,
                fill: GREEN,
              }}
            />
          )}
          <Bar
            dataKey="quantidade"
            name="Ocorrências CAT"
            fill={YELLOW}
            radius={[4, 4, 0, 0]}
            className="cursor-pointer"
            onClick={(entry: { mes?: string; payload?: { mes?: string } }) => {
              const m = entry?.mes ?? entry?.payload?.mes;
              if (m) toggleMonthFilter(m);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartCatSegmento = (
    <ChartCard
      title="CAT por Segmento"
      subtitle={`${segSubtitle} (Acumulado Anual)`}
      badge="Clique na fatia p/ filtrar"
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={catSegFiltrado}
            dataKey="quantidade"
            nameKey="segmento"
            innerRadius={48}
            outerRadius={90}
            paddingAngle={2}
            className="cursor-pointer outline-none"
            onClick={(entry: { segmento?: string; payload?: { segmento?: string } }) => {
              const target = entry?.segmento ?? entry?.payload?.segmento;
              if (target) toggleSegFilter(target);
            }}
          >
            {catSegFiltrado.map((r, i) => (
              <Cell
                key={r.segmento}
                fill={SEG_COLORS[r.segmento] ?? PIE_COLORS[i % PIE_COLORS.length]}
                stroke={segAtivo === r.segmento ? "#111827" : "#ffffff"}
                strokeWidth={segAtivo === r.segmento ? 2 : 1}
              />
            ))}
          </Pie>
          <Tooltip content={<BrandTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartCatAno = (
    <ChartCard
      title="CAT por Ano - Consolidado Histórico"
      subtitle="Colunas empilhadas por ano (Sem afastamento + Com afastamento) • Clique p/ filtrar segmento"
      badge={segSubtitle}
      heightClass="h-80"
    >
      <ResponsiveContainer>
        <BarChart data={catAnoFiltrado}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="segmento" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip showTotal />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {catAnoKeys.map((k) => {
            const anoRef = k.split(" ")[0];
            const anosOrd = Array.from(new Set(catAnoKeys.map((x) => x.split(" ")[0])));
            const idx = anosOrd.indexOf(anoRef);
            const greens = [GREEN_45, GREEN_60, GREEN_80, GREEN];
            const yellows = [YELLOW_45, YELLOW_65, YELLOW_80, YELLOW];
            const pos = Math.max(0, greens.length - anosOrd.length + idx);
            const isComAfast = k.includes("c/");
            const fill = isComAfast ? yellows[pos] : greens[pos];
            return (
              <Bar
                key={k}
                dataKey={k}
                stackId={anoRef}
                fill={fill}
                radius={isComAfast ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                className="cursor-pointer"
                onClick={(entry: { segmento?: string; payload?: { segmento?: string } }) => {
                  const target = entry?.segmento ?? entry?.payload?.segmento;
                  if (target) toggleSegFilter(target);
                }}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartEnfermagem = (
    <ChartCard
      title="Atendimentos de Enfermagem"
      subtitle={`Diurno x Noturno x Total • ${periodoAtual.shortLabel}`}
      badge={scopeEmpresaBadge ?? `${formatPct(kpis.enfermagemNoturnoPct, 1)} noturno`}
    >
      <ResponsiveContainer>
        <ComposedChart data={filtered.atendimentosEnfermagem}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="DIURNO" name="Diurno" stackId="a" fill={GREEN} />
          <Bar dataKey="NOTURNO" name="Noturno" stackId="a" fill={YELLOW} radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="TOTAL"
            name="Total"
            stroke={GREEN_MARK}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartMerp = (
    <ChartCard
      title="Atendimentos MERP"
      subtitle={`Evolução mensal • ${periodoAtual.shortLabel}`}
      badge={scopeEmpresaBadge ?? `Total: ${formatInt(kpis.totalMerp)}`}
    >
      <ResponsiveContainer>
        <LineChart data={filtered.atendimentosMerp}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip />} />
          <Line
            type="monotone"
            dataKey="quantidade"
            name="Atendimentos MERP"
            stroke={YELLOW}
            strokeWidth={3}
            dot={{ fill: GREEN, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartAtestados = (
    <ChartCard
      title="Atestados Médicos por Segmento"
      subtitle={`${segSubtitle} • ${periodoAtual.shortLabel}`}
      badge={`Total: ${formatInt(kpis.totalAtestados)}`}
    >
      <ResponsiveContainer>
        <BarChart data={filtered.atestadoMedico}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip showTotal />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {segList.map((s, idx) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="a"
              fill={SEG_COLORS[s] ?? PIE_COLORS[idx % PIE_COLORS.length]}
              radius={idx === segList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartAbsenteismo = (
    <ChartCard
      title="Taxa de Absenteísmo (%)"
      subtitle={`${segSubtitle} • ${periodoAtual.shortLabel}`}
      badge={`Média: ${formatPct(filtered.mediaAbsenteismo)}`}
    >
      <ResponsiveContainer>
        <LineChart data={filtered.taxaAbsenteismo}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="%" />
          <Tooltip content={<BrandTooltip valueSuffix="%" decimals={2} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {filtered.taxaAbsenteismo.length > 1 && (
            <ReferenceLine
              y={filtered.mediaAbsenteismo}
              stroke={GREEN_MARK}
              strokeDasharray="4 4"
              label={{
                value: `Média (${formatPct(filtered.mediaAbsenteismo, 1)})`,
                position: "insideTopRight",
                fontSize: 10,
                fill: GREEN_MARK,
              }}
            />
          )}
          {segList.map((s, idx) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={SEG_COLORS[s] ?? PIE_COLORS[idx % PIE_COLORS.length]}
              strokeWidth={2.2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartAfastInss = (
    <ChartCard
      title="Afastamento INSS por Segmento"
      subtitle={`${segSubtitle} • ${periodoAtual.shortLabel}`}
      badge={`Novos: ${formatInt(kpis.totalAfastInss)}`}
    >
      <ResponsiveContainer>
        <BarChart data={filtered.afastamentoInss}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip showTotal />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {segList.map((s, idx) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="a"
              fill={SEG_COLORS[s] ?? PIE_COLORS[idx % PIE_COLORS.length]}
              radius={idx === segList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartAfastStatus = (
    <ChartCard
      title="Afastamentos por Status"
      subtitle={`Evolução mensal • ${periodoAtual.shortLabel}`}
      badge={scopeEmpresaBadge}
    >
      <ResponsiveContainer>
        <AreaChart data={filtered.afastamentoStatus}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip showTotal />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {data.statusAfast.map((s, idx) => (
            <Area
              key={s}
              type="monotone"
              dataKey={s}
              stackId="1"
              stroke={STATUS_COLORS[s] ?? PIE_COLORS[idx % PIE_COLORS.length]}
              fill={STATUS_COLORS[s] ?? PIE_COLORS[idx % PIE_COLORS.length]}
              fillOpacity={0.75}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartLimbo = (
    <ChartCard
      title="Limbo Previdenciário por Segmento"
      subtitle={`${segSubtitle} • ${periodoAtual.shortLabel}`}
      badge={`Atual (${kpis.limboMesFinal}): ${formatInt(kpis.limboAtual)}`}
    >
      <ResponsiveContainer>
        <AreaChart data={filtered.limboPrevidenciario}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip showTotal />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {segList.map((s, idx) => (
            <Area
              key={s}
              type="monotone"
              dataKey={s}
              stackId="1"
              stroke={SEG_COLORS[s] ?? PIE_COLORS[idx % PIE_COLORS.length]}
              fill={SEG_COLORS[s] ?? PIE_COLORS[idx % PIE_COLORS.length]}
              fillOpacity={0.7}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const chartQualidadeVida = (
    <ChartCard
      title="Qualidade de Vida - Previsto x Realizado"
      subtitle={`Execução mensal de ações • ${periodoAtual.shortLabel}`}
      badge={scopeEmpresaBadge ?? `${formatPct(kpis.qvTaxaPct, 0)} concluído`}
    >
      <ResponsiveContainer>
        <BarChart data={filtered.qualidadeVida}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<BrandTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="PREVISTA" name="Prevista" fill={GREEN} radius={[4, 4, 0, 0]} />
          <Bar dataKey="REALIZADA" name="Realizada" fill={YELLOW} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  const executiveKpiGrid = (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <KpiCard
        label="ASO Periódico"
        value={formatInt(kpis.asoRealizado)}
        sublabel={`Previsto: ${formatInt(kpis.asoPrevisto)} (${formatPct(kpis.asoTaxaPct, 0)} adesão)`}
        icon={UserCheck}
        accent={GREEN}
        progressPct={kpis.asoTaxaPct}
        trend={kpis.asoTrend}
        scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
      />
      <KpiCard
        label="Taxa Absenteísmo"
        value={formatPct(kpis.absenteismoMedio)}
        sublabel={`Média mensal (${segSubtitle})`}
        icon={Activity}
        accent={YELLOW}
        trend={kpis.absenteismoTrend}
      />
      <KpiCard
        label="Comunicações CAT"
        value={formatInt(kpis.totalCat)}
        sublabel={kpis.catSublabel}
        icon={ShieldAlert}
        accent={YELLOW}
        trend={kpis.catTrend}
        scopeBadge={!kpis.catIsSegmentExact && segAtivo !== "TODOS" ? "Empresa" : undefined}
      />
      <KpiCard
        label="Atestados Médicos"
        value={formatInt(kpis.totalAtestados)}
        sublabel={`Acumulado (${segSubtitle})`}
        icon={FileText}
        accent={GREEN}
        trend={kpis.atestadosTrend}
      />
      <KpiCard
        label="Casos em Limbo"
        value={formatInt(kpis.limboAtual)}
        sublabel={`Posição em ${kpis.limboMesFinal} (${segSubtitle})`}
        icon={UserX}
        accent={YELLOW}
        trend={kpis.limboTrend}
      />
      <KpiCard
        label="Atend. Clínicos"
        value={formatInt(kpis.totalEnfermagem + kpis.totalMerp)}
        sublabel={`Enf: ${formatInt(kpis.totalEnfermagem)} • MERP: ${formatInt(kpis.totalMerp)}`}
        icon={Stethoscope}
        accent={GREEN}
        trend={kpis.enfermagemTrend}
        scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
      />
    </section>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Brand Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div
              className="h-10 w-10 shrink-0 rounded-lg shadow-xs"
              style={{ background: `linear-gradient(135deg, ${GREEN} 50%, ${YELLOW} 50%)` }}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Dashboard {setorLabel} • {ano}
                </h1>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  Bravante
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Evolução mensal de saúde ocupacional, segurança e qualidade de vida
              </p>
              <div className="no-print mt-2.5 flex flex-wrap items-center gap-1.5">
                {SETORES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSetor(s.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
                      setor === s.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border bg-white text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
                <span className="mx-1 h-4 w-px bg-border" />
                {ANOS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAno(a)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      ano === a
                        ? "bg-accent text-accent-foreground ring-1 ring-primary/25"
                        : "border bg-white text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Data Actions */}
          <div className="no-print flex flex-wrap items-center gap-2">
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
              type="button"
              onClick={handleExportTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary shadow-xs transition-colors hover:bg-primary/5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar template
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              {importing ? "Importando..." : "Importar Excel"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground shadow-xs transition-colors hover:bg-muted cursor-pointer"
              title="Imprimir aba atual ou salvar como PDF"
            >
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
              PDF / Imprimir
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-xs transition-colors hover:bg-muted cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restaurar dados iniciais?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação removerá quaisquer planilhas importadas localmente para{" "}
                    <strong>
                      {setorLabel} • {ano}
                    </strong>{" "}
                    e restaurará os valores padrão do sistema.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>Confirmar restauração</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Sticky Filter Sub-bar */}
      {!empty && (
        <div className="no-print sticky top-0 z-20 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-3">
              {/* Period Filter */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <label
                  htmlFor="select-periodo"
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Período
                </label>
                <select
                  id="select-periodo"
                  value={periodoAtual.id}
                  onChange={(e) => setPeriodo(e.target.value as PeriodoId)}
                  className="rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <optgroup label="Visão Anual e Semestral">
                    {periodoOptions
                      .filter((o) => o.group === "visao" || o.group === "semestre")
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Trimestres">
                    {periodoOptions
                      .filter((o) => o.group === "trimestre")
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Mês Específico">
                    {periodoOptions
                      .filter((o) => o.group === "mes")
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Segment Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-primary" />
                <label
                  htmlFor="select-segmento"
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Segmento
                </label>
                <select
                  id="select-segmento"
                  value={segAtivo}
                  onChange={(e) => setSeg(e.target.value)}
                  className="rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="TODOS">Todos os segmentos</option>
                  {data.segmentos.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Filter Chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-1.5 border-l pl-3">
                  {periodoAtual.id !== "ANO" && (
                    <button
                      type="button"
                      onClick={() => setPeriodo("ANO")}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 cursor-pointer"
                    >
                      {periodoAtual.shortLabel}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {segAtivo !== "TODOS" && (
                    <button
                      type="button"
                      onClick={() => setSeg("TODOS")}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200 cursor-pointer"
                    >
                      {segAtivo}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodo("ANO");
                      setSeg("TODOS");
                    }}
                    className="text-xs font-medium text-muted-foreground underline hover:text-foreground cursor-pointer"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>

            <span className="hidden text-[11px] text-muted-foreground xl:inline">
              Dica: clique em fatias ou barras para filtrar interativamente
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
        {empty ? (
          <DashboardEmptyState
            setorLabel={setorLabel}
            ano={ano}
            onImportClick={() => fileRef.current?.click()}
            onExportTemplate={handleExportTemplate}
          />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
            className="space-y-6"
          >
            {/* Navigation Tabs */}
            <div className="no-print overflow-x-auto pb-1">
              <TabsList className="inline-flex h-auto min-w-max flex-wrap justify-start gap-1 rounded-xl bg-muted/80 p-1.5">
                <TabsTrigger value="visao-executiva" className="gap-1.5 py-1.5 text-xs sm:text-sm">
                  <LayoutDashboard className="h-4 w-4" />
                  Visão Executiva
                </TabsTrigger>
                <TabsTrigger value="aso-clinico" className="gap-1.5 py-1.5 text-xs sm:text-sm">
                  <Stethoscope className="h-4 w-4" />
                  ASO & Atendimentos
                </TabsTrigger>
                <TabsTrigger value="seguranca-cat" className="gap-1.5 py-1.5 text-xs sm:text-sm">
                  <ShieldAlert className="h-4 w-4" />
                  Segurança (CAT)
                </TabsTrigger>
                <TabsTrigger value="absenteismo-inss" className="gap-1.5 py-1.5 text-xs sm:text-sm">
                  <Activity className="h-4 w-4" />
                  Absenteísmo & Afastamentos
                </TabsTrigger>
                <TabsTrigger value="qualidade-vida" className="gap-1.5 py-1.5 text-xs sm:text-sm">
                  <HeartHandshake className="h-4 w-4" />
                  Qualidade de Vida
                </TabsTrigger>
                <TabsTrigger value="visao-completa" className="gap-1.5 py-1.5 text-xs sm:text-sm">
                  <Layers className="h-4 w-4" />
                  Visão Completa
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: VISÃO EXECUTIVA */}
            <TabsContent value="visao-executiva" className="space-y-6">
              <InsightsPanel insights={insights} periodoLabel={periodoAtual.shortLabel} />
              {executiveKpiGrid}

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartAbsenteismo}
                {chartAsoPrevReal}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">{chartCatMes}</div>
                {chartCatSegmento}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartLimbo}
                {chartAfastStatus}
              </section>
            </TabsContent>

            {/* TAB 2: ASO & ATENDIMENTOS */}
            <TabsContent value="aso-clinico" className="space-y-6">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard
                  label="ASO Previsto"
                  value={formatInt(kpis.asoPrevisto)}
                  sublabel={`Período: ${periodoAtual.shortLabel}`}
                  icon={FileText}
                  accent={GREEN}
                  scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
                />
                <KpiCard
                  label="ASO Realizado"
                  value={formatInt(kpis.asoRealizado)}
                  sublabel={`${formatPct(kpis.asoTaxaPct, 0)} de cumprimento`}
                  icon={UserCheck}
                  accent={YELLOW}
                  progressPct={kpis.asoTaxaPct}
                  trend={kpis.asoTrend}
                  scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
                />
                <KpiCard
                  label="Não Contratação"
                  value={formatInt(kpis.totalNaoContratacao)}
                  sublabel="Recomendações no ASO"
                  icon={UserX}
                  accent={GREEN}
                  trend={kpis.naoContrTrend}
                  scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
                />
                <KpiCard
                  label="Atend. Enfermagem"
                  value={formatInt(kpis.totalEnfermagem)}
                  sublabel={`${formatPct(kpis.enfermagemNoturnoPct, 1)} em plantão noturno`}
                  icon={Stethoscope}
                  accent={GREEN}
                  trend={kpis.enfermagemTrend}
                  scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
                />
                <KpiCard
                  label="Atend. MERP"
                  value={formatInt(kpis.totalMerp)}
                  sublabel="Ocorrências atendidas"
                  icon={BriefcaseMedical}
                  accent={YELLOW}
                  trend={kpis.merpTrend}
                  scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
                />
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartAsoPrevReal}
                {chartAlteracoesAso}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {chartNaoContratacao}
                {chartEnfermagem}
                {chartMerp}
              </section>
            </TabsContent>

            {/* TAB 3: SEGURANÇA (CAT) */}
            <TabsContent value="seguranca-cat" className="space-y-6">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KpiCard
                  label="Total CAT no Recorte"
                  value={formatInt(kpis.totalCat)}
                  sublabel={kpis.catSublabel}
                  icon={ShieldAlert}
                  accent={YELLOW}
                  trend={kpis.catTrend}
                  scopeBadge={!kpis.catIsSegmentExact && segAtivo !== "TODOS" ? "Empresa" : undefined}
                />
                <KpiCard
                  label="Média Mensal CAT"
                  value={filtered.mediaCatMensal.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  sublabel={`Referência em ${periodoAtual.shortLabel}`}
                  icon={Activity}
                  accent={GREEN}
                  scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
                />
                <KpiCard
                  label="CAT Anual por Segmento"
                  value={formatInt(catSegFiltrado.reduce((s, r) => s + r.quantidade, 0))}
                  sublabel={segSubtitle}
                  icon={Layers}
                  accent={GREEN}
                />
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">{chartCatMes}</div>
                {chartCatSegmento}
              </section>

              <section>{chartCatAno}</section>
            </TabsContent>

            {/* TAB 4: ABSENTEÍSMO & AFASTAMENTOS */}
            <TabsContent value="absenteismo-inss" className="space-y-6">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Taxa Média Absenteísmo"
                  value={formatPct(kpis.absenteismoMedio)}
                  sublabel={segSubtitle}
                  icon={Activity}
                  accent={YELLOW}
                  trend={kpis.absenteismoTrend}
                />
                <KpiCard
                  label="Total Atestados"
                  value={formatInt(kpis.totalAtestados)}
                  sublabel={`${segSubtitle} • ${periodoAtual.shortLabel}`}
                  icon={FileText}
                  accent={GREEN}
                  trend={kpis.atestadosTrend}
                />
                <KpiCard
                  label="Novos Afast. INSS"
                  value={formatInt(kpis.totalAfastInss)}
                  sublabel={`${segSubtitle} • ${periodoAtual.shortLabel}`}
                  icon={BriefcaseMedical}
                  accent={GREEN}
                  trend={kpis.inssTrend}
                />
                <KpiCard
                  label="Limbo Previdenciário"
                  value={formatInt(kpis.limboAtual)}
                  sublabel={`Posição em ${kpis.limboMesFinal} (${segSubtitle})`}
                  icon={UserX}
                  accent={YELLOW}
                  trend={kpis.limboTrend}
                />
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartAbsenteismo}
                {chartAtestados}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartAfastInss}
                {chartAfastStatus}
              </section>

              <section>{chartLimbo}</section>
            </TabsContent>

            {/* TAB 5: QUALIDADE DE VIDA */}
            <TabsContent value="qualidade-vida" className="space-y-6">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KpiCard
                  label="Ações Previstas"
                  value={formatInt(kpis.qvPrevista)}
                  sublabel={`Período: ${periodoAtual.shortLabel}`}
                  icon={Calendar}
                  accent={GREEN}
                  scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
                />
                <KpiCard
                  label="Ações Realizadas"
                  value={formatInt(kpis.qvRealizada)}
                  sublabel={`Período: ${periodoAtual.shortLabel}`}
                  icon={HeartHandshake}
                  accent={YELLOW}
                  scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
                />
                <KpiCard
                  label="% Atendimento QV"
                  value={formatPct(kpis.qvTaxaPct, 0)}
                  sublabel="Índice de execução das ações"
                  icon={CheckCircle2}
                  accent={GREEN}
                  progressPct={kpis.qvTaxaPct}
                  scopeBadge={segAtivo !== "TODOS" ? "Empresa" : undefined}
                />
              </section>

              <section>{chartQualidadeVida}</section>
            </TabsContent>

            {/* TAB 6: VISÃO COMPLETA */}
            <TabsContent value="visao-completa" className="space-y-6">
              <InsightsPanel insights={insights} periodoLabel={periodoAtual.shortLabel} />
              {executiveKpiGrid}

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartAsoPrevReal}
                {chartAlteracoesAso}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {chartNaoContratacao}
                {chartCatMes}
                {chartCatSegmento}
              </section>

              <section>{chartCatAno}</section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartEnfermagem}
                {chartMerp}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartAtestados}
                {chartAbsenteismo}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartAfastInss}
                {chartAfastStatus}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartLimbo}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <KpiCard
                      label="Ações Previstas"
                      value={formatInt(kpis.qvPrevista)}
                      icon={Calendar}
                      accent={GREEN}
                    />
                    <KpiCard
                      label="Ações Realizadas"
                      value={formatInt(kpis.qvRealizada)}
                      icon={HeartHandshake}
                      accent={YELLOW}
                    />
                    <KpiCard
                      label="% Atendimento"
                      value={formatPct(kpis.qvTaxaPct, 0)}
                      icon={CheckCircle2}
                      accent={GREEN}
                      progressPct={kpis.qvTaxaPct}
                    />
                  </div>
                  {chartQualidadeVida}
                </div>
              </section>
            </TabsContent>
          </Tabs>
        )}

        <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
          Setor {setorLabel} • Ano {ano} • Recorte: {periodoAtual.shortLabel} ({segSubtitle}) •
          Identidade Visual Bravante
        </footer>
      </main>
    </div>
  );
}
