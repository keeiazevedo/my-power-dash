import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  FileText,
  Headset,
  Maximize2,
  Minimize2,
  Moon,
  Search,
  Stethoscope,
  Sun,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemoKpi } from "@/components/dashboard/demo-kpi";
import { useDashboardData } from "@/lib/dashboard-store";
import { MESES_ADM, useAdmData } from "@/lib/adm-store";
import { getPeriodoOptions, type PeriodoId } from "@/lib/dashboard-analytics";
import {
  formatMetric,
  previewAnalysis,
  searchMetrics,
  type PreviewFilters,
} from "@/lib/demo-analysis";
import { segColor } from "@/lib/segment-colors";

export const Route = createFileRoute("/demonstracao")({
  head: () => ({
    meta: [
      { title: "Prévia de Busca e Parecer Executivo | Bravante" },
      {
        name: "description",
        content:
          "Demonstração independente de busca de indicadores e parecer executivo calculado sobre os filtros de Saúde e Administrativo Bravante.",
      },
      { property: "og:title", content: "Busca e Parecer Executivo | Bravante" },
      {
        property: "og:description",
        content: "Prévia de consulta de indicadores e síntese executiva baseada nos dados de 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const [filters, setFilters] = useState<PreviewFilters>({
    sector: "SAUDE",
    period: "ANO",
    segment: "TODOS",
  });
  const [dark, setDark] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [focusedMetric, setFocusedMetric] = useState("");
  const [report, setReport] = useState<{
    signature: string;
    context: string;
    paragraphs: string[];
  } | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const reportPanel = useRef<HTMLElement>(null);
  const { data: health } = useDashboardData("SAUDE", "2026");
  const { data: adm } = useAdmData("2026");
  const analysis = previewAnalysis(health, adm, filters);
  const signature = JSON.stringify({ filters, metrics: analysis.metrics });
  const visibleReport = report?.signature === signature ? report : null;
  const results = searchMetrics(analysis.metrics, query);
  const isHealth = filters.sector === "SAUDE";
  const segments = isHealth
    ? health.segmentos
    : [...new Set([...adm.uber, ...adm.viagens].map((r) => r.segmento))];
  const shownSegments = filters.segment === "TODOS" ? segments : [filters.segment];
  const distribution = analysis.months.map((mes) => ({
    mes,
    ...Object.fromEntries(
      shownSegments.map((s) => [
        s,
        isHealth
          ? Number(health.atestadoMedico.find((r) => r["mes"] === mes)?.[s] ?? 0)
          : adm.viagens
              .filter((r) => r.mes === mes && r.segmento === s)
              .reduce((a, r) => a + r.valor, 0),
      ]),
    ),
  }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        search.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setPresenting(false);
      }
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, []);
  const scrollTo = (element: HTMLElement | null) =>
    element?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
  function selectMetric(id: string) {
    setFocusedMetric(id);
    setSearchOpen(false);
    setQuery("");
    scrollTo(document.getElementById(`metric-${id}`));
    document.getElementById(`metric-${id}`)?.focus({ preventScroll: true });
  }
  function updateFilters(next: Partial<PreviewFilters>) {
    setFilters((v) => ({ ...v, ...next }));
    setQuery("");
    setSearchOpen(false);
    setCopyStatus("");
    setFocusedMetric("");
  }
  async function togglePresentation() {
    if (presenting) {
      setPresenting(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    } else {
      setPresenting(true);
      await container.current?.requestFullscreen?.().catch(() => {});
    }
  }
  function generateReport() {
    setReport({ signature, context: analysis.context, paragraphs: analysis.paragraphs });
    setCopyStatus("");
    requestAnimationFrame(() => scrollTo(reportPanel.current));
  }
  async function copyReport() {
    if (!visibleReport) return;
    try {
      await navigator.clipboard.writeText(
        `Parecer executivo — Bravante\n${visibleReport.context}\n\n${visibleReport.paragraphs.join("\n\n")}\n\nSíntese automática descritiva, sem metas oficiais ou atribuição de causas.`,
      );
      setCopyStatus("Copiado");
    } catch {
      setCopyStatus("Não foi possível copiar. Selecione o texto do parecer.");
    }
  }

  return (
    <div
      ref={container}
      className={`dashboard-demo min-h-screen bg-background text-foreground ${dark ? "demo-dark" : ""} ${presenting ? "demo-presenting" : ""}`}
    >
      {!presenting && (
        <div className="border-b bg-muted/50">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-5 py-2 text-xs text-muted-foreground">
            <span>Prévia · Busca e parecer executivo · 2026</span>
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft />
                Painel original
              </Link>
            </Button>
          </div>
        </div>
      )}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <div className="flex items-center gap-4">
            <Activity className="size-9 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-primary">
                Bravante · Indicadores de gestão
              </p>
              <h1 className="mt-1 text-2xl font-semibold">
                {isHealth ? "Saúde Ocupacional" : "Administrativo"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              title={dark ? "Tema claro" : "Tema escuro"}
              aria-label={dark ? "Tema claro" : "Tema escuro"}
              onClick={() => setDark((v) => !v)}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button variant="outline" onClick={togglePresentation}>
              {presenting ? <Minimize2 /> : <Maximize2 />}
              {presenting ? "Sair da apresentação" : "Apresentar"}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8">
        {!presenting && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Setor">
            <Button
              aria-pressed={isHealth}
              variant={isHealth ? "default" : "outline"}
              onClick={() => updateFilters({ sector: "SAUDE", segment: "TODOS" })}
            >
              <Stethoscope />
              Saúde
            </Button>
            <Button
              aria-pressed={!isHealth}
              variant={!isHealth ? "default" : "outline"}
              onClick={() => updateFilters({ sector: "ADMINISTRATIVO", segment: "TODOS" })}
            >
              <Headset />
              Administrativo
            </Button>
          </div>
        )}
        <section
          className="flex flex-wrap items-end gap-3 border-b pb-5"
          aria-label="Consulta de indicadores"
        >
          <label className="min-w-40 flex-1 text-xs font-semibold text-muted-foreground">
            PERÍODO
            <select
              aria-label="Período"
              value={filters.period}
              onChange={(e) => updateFilters({ period: e.target.value as PeriodoId })}
              className="mt-2 h-10 w-full rounded-md border bg-card px-3 text-sm font-normal text-foreground"
            >
              {getPeriodoOptions(isHealth ? health.meses : MESES_ADM).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-40 flex-1 text-xs font-semibold text-muted-foreground">
            SEGMENTO
            <select
              aria-label="Segmento"
              value={filters.segment}
              onChange={(e) => updateFilters({ segment: e.target.value })}
              className="mt-2 h-10 w-full rounded-md border bg-card px-3 text-sm font-normal text-foreground"
            >
              <option value="TODOS">Todos os segmentos</option>
              {segments.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div
            className="relative min-w-0 basis-full lg:basis-auto lg:flex-[2]"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setSearchOpen(false);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              ref={search}
              role="combobox"
              aria-label="Buscar indicador"
              aria-expanded={searchOpen}
              aria-controls="indicator-results"
              aria-autocomplete="list"
              aria-activedescendant={
                searchOpen && results[active] ? `result-${results[active]?.id}` : undefined
              }
              placeholder="Buscar indicador…"
              className="h-10 bg-card pl-9 pr-10"
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((v) => Math.min(v + 1, results.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((v) => Math.max(0, v - 1));
                }
                if (e.key === "Enter" && results[active]) {
                  e.preventDefault();
                  const m = results[active];
                  if (m) selectMetric(m.id);
                }
                if (e.key === "Escape") setSearchOpen(false);
              }}
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 size-8"
                aria-label="Limpar busca"
                onClick={() => {
                  setQuery("");
                  setActive(0);
                  search.current?.focus();
                }}
              >
                <X />
              </Button>
            )}
            {searchOpen && (
              <div
                id="indicator-results"
                role="listbox"
                aria-label="Indicadores encontrados"
                className="absolute inset-x-0 top-12 z-30 max-h-80 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-sm"
              >
                {results.length ? (
                  results.map((m, i) => (
                    <Button
                      key={m.id}
                      id={`result-${m.id}`}
                      role="option"
                      aria-selected={i === active}
                      variant="ghost"
                      className={`h-auto w-full justify-between gap-3 whitespace-normal py-3 text-left ${i === active ? "bg-accent" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectMetric(m.id)}
                    >
                      <span>{m.label}</span>
                      <ArrowRight className="shrink-0" />
                    </Button>
                  ))
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">Nenhum indicador encontrado.</p>
                )}
              </div>
            )}
          </div>
          <Button disabled={analysis.empty} className="h-10" onClick={generateReport}>
            <FileText />
            Gerar Parecer
          </Button>
        </section>
        <section aria-labelledby="overview">
          <div className="mb-5">
            <h2 id="overview" className="text-lg font-semibold">
              Visão Executiva
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{analysis.context}</p>
          </div>
          {analysis.empty ? (
            <p className="border-y py-10 text-sm text-muted-foreground">
              Não há dados disponíveis para o período selecionado.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {analysis.metrics.map((m) => (
                <div
                  id={`metric-${m.id}`}
                  key={m.id}
                  tabIndex={-1}
                  className={`min-w-0 rounded-lg outline-none ${focusedMetric === m.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                >
                  <DemoKpi
                    label={m.label}
                    value={formatMetric(m)}
                    note={m.note}
                    points={m.points}
                    icon={isHealth ? Stethoscope : Headset}
                    accent={["cat", "viagens", "social"].includes(m.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
        <section
          ref={reportPanel}
          aria-labelledby="report-title"
          className="scroll-mt-8 border-y py-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <h2 id="report-title" className="text-lg font-semibold">
                Parecer Executivo
              </h2>
            </div>
            {visibleReport && (
              <Button variant="outline" onClick={copyReport}>
                {copyStatus === "Copiado" ? <Check /> : <Copy />}
                {copyStatus === "Copiado" ? "Copiado" : "Copiar parecer"}
              </Button>
            )}
          </div>
          {visibleReport ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">{visibleReport.context}</p>
              <div className="mt-5 max-w-5xl space-y-4 text-sm leading-7" aria-live="polite">
                {visibleReport.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                Síntese automática descritiva · Sem metas oficiais ou atribuição de causas · Sujeita
                à validação da coordenação
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {report
                ? "Os filtros mudaram. Parecer anterior desatualizado."
                : "Nenhum parecer gerado."}
            </p>
          )}
          {copyStatus && (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              {copyStatus}
            </p>
          )}
        </section>
        {!analysis.empty && (
          <section className="min-w-0 border-t pt-5" aria-label="Distribuição por segmento">
            <h2 className="font-semibold">
              {isHealth ? "Atestados por segmento" : "Custo Viagens por segmento"}
            </h2>
            <p className="mb-5 mt-1 text-xs text-muted-foreground">{analysis.context}</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    interval={0}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={55}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) =>
                      Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)
                    }
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      color: "var(--popover-foreground)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                    }}
                    itemSorter={(i) => -Number(i.value ?? 0)}
                    formatter={(v: number) =>
                      formatMetric({ value: v, kind: isHealth ? "number" : "money" })
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {shownSegments.map((s) => (
                    <Bar
                      key={s}
                      dataKey={s}
                      stackId="segments"
                      fill={segColor(s)}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
        <footer className="border-t py-4 text-xs text-muted-foreground">
          Bravante · {isHealth ? "Saúde Ocupacional" : "Administrativo"} · 2026
        </footer>
      </main>
    </div>
  );
}
