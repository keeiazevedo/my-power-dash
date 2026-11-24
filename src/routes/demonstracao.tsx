import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Activity, ArrowLeft, Car, CheckCircle2, Headset, HeartHandshake, Maximize2, Minimize2, Moon, Plane, ShieldAlert, Stethoscope, Sun, Tickets, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { DemoKpi, type DemoMetric, type DemoPoint } from "@/components/dashboard/demo-kpi";
import { useDashboardData, somaQtd } from "@/lib/dashboard-store";
import { MESES_ADM, useAdmData } from "@/lib/adm-store";
import { computeExecutiveKpis, filterDashboardByPeriodo, formatInt, formatPct } from "@/lib/dashboard-analytics";
import { segColor } from "@/lib/segment-colors";

export const Route = createFileRoute("/demonstracao")({
  head: () => ({ meta: [
    { title: "Prévia Executiva | Bravante Saúde e Administrativo" },
    { name: "description", content: "Prévia visual dos indicadores Bravante, com evolução mensal, tema escuro e apresentação executiva." },
    { property: "og:title", content: "Prévia Executiva | Bravante" },
    { property: "og:description", content: "Indicadores de Saúde e Administrativo em uma prévia visual independente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: DemoPage,
});

const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const total = (points: DemoPoint[]) => points.reduce((a, p) => a + p.valor, 0);
const chartTooltip = { background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 6 };

function DemoPage() {
  const [sector, setSector] = useState("SAUDE");
  const [dark, setDark] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const { data: health } = useDashboardData("SAUDE", "2026");
  const { data: adm } = useAdmData("2026");
  const filtered = filterDashboardByPeriodo(health, "ANO", health.segmentos);
  const kpi = computeExecutiveKpis(health, filtered, "ANO", "TODOS", health.segmentos);
  const healthMonths = health.meses.slice(0, health.meses.indexOf(kpi.refMesAtual) + 1);
  const pointsFor = (get: (mes: string) => number) => healthMonths.map(mes => ({ mes, valor: get(mes) }));
  const rowSum = (row: Record<string, string | number> | undefined) => health.segmentos.reduce((a, s) => a + Number(row?.[s] ?? 0), 0);
  const aso = pointsFor(m => health.asoPeriodicoPrevReal.find(r => r.mes === m)?.REALIZADOS ?? 0);
  const cat = pointsFor(m => health.catPorMes.find(r => r.mes === m)?.quantidade ?? 0);
  const atestados = pointsFor(m => rowSum(health.atestadoMedico.find(r => r.mes === m)));
  const atendimento = pointsFor(m => (health.atendimentosEnfermagem.find(r => r.mes === m)?.TOTAL ?? 0) + (health.atendimentosMerp.find(r => r.mes === m)?.quantidade ?? 0));
  const pqv = pointsFor(m => health.qualidadeVida.find(r => r.mes === m)?.REALIZADA ?? 0);
  const monthlyOnly = (rows?: { mes: string; quantidade: number }[]) => (rows ?? []).filter(r => healthMonths.includes(r.mes)).map(r => ({ mes: r.mes, valor: r.quantidade }));
  const healthCards: DemoMetric[] = [
    { label: "ASO periódicos realizados", value: formatInt(kpi.asoRealizado), note: `${formatPct(kpi.asoTaxaPct, 0)} de adesão · acumulado 2026`, points: aso, icon: Stethoscope },
    { label: "Total de CAT", value: formatInt(kpi.totalCat), note: kpi.catSublabel, points: cat, icon: ShieldAlert, accent: true },
    { label: "Atestados médicos", value: formatInt(kpi.totalAtestados), note: "Todos os segmentos · acumulado 2026", points: atestados, icon: Tickets },
    { label: "Atendimentos de saúde", value: formatInt(kpi.totalEnfermagem + kpi.totalMerp), note: "Enfermagem + MERP · acumulado 2026", points: atendimento, icon: Activity },
    { label: "Casos em limbo", value: formatInt(kpi.limboAtual), note: `Último mês com dados: ${kpi.limboMesFinal}`, points: pointsFor(m => rowSum(health.limboPrevidenciario.find(r => r.mes === m))).slice(0, healthMonths.indexOf(kpi.limboMesFinal) + 1), icon: Users, accent: true },
    { label: "Ações PQV", value: formatInt(kpi.qvRealizada), note: "Campanhas e informes", points: pqv, icon: HeartHandshake },
    { label: "Testes Álcool e Drogas", value: formatInt(somaQtd(health.testesAlcoolDrogas)), note: "Testes aleatórios · acumulado 2026", points: monthlyOnly(health.testesAlcoolDrogas), icon: ShieldAlert },
    { label: "Atendimentos sociais", value: formatInt(somaQtd(health.atendimentosSociais)), note: "Acumulado 2026", points: monthlyOnly(health.atendimentosSociais), icon: HeartHandshake, accent: true },
  ];
  const lastAdmIndex = Math.max(-1, ...adm.uber.map(r => MESES_ADM.indexOf(r.mes)), ...adm.viagens.map(r => MESES_ADM.indexOf(r.mes)), ...adm.chamados.map(r => MESES_ADM.indexOf(r.mes)));
  const admMonths = MESES_ADM.slice(0, lastAdmIndex + 1);
  const uber = admMonths.map(mes => ({ mes, valor: adm.uber.filter(r => r.mes === mes).reduce((a, r) => a + r.valor, 0) }));
  const corridas = admMonths.map(mes => ({ mes, valor: adm.uber.filter(r => r.mes === mes).reduce((a, r) => a + r.corridas, 0) }));
  const viagens = admMonths.map(mes => ({ mes, valor: adm.viagens.filter(r => r.mes === mes).reduce((a, r) => a + r.valor, 0) }));
  const chamados = admMonths.map(mes => ({ mes, valor: adm.chamados.filter(r => r.mes === mes).reduce((a, r) => a + r.total, 0) }));
  const solved = adm.chamados.reduce((a, r) => a + r.solucionados, 0);
  const qtyTravel = adm.quantidadeViagensTotal ?? adm.viagens.reduce((a, r) => a + (r.quantidade ?? 0), 0);
  const admCards: DemoMetric[] = [
    { label: "Chamados administrativos", value: formatInt(total(chamados)), note: "Acumulado 2026", points: chamados, icon: Headset },
    { label: "Taxa de resolução", value: formatPct(total(chamados) ? solved / total(chamados) * 100 : 0, 1), note: `${formatInt(solved)} chamados solucionados`, points: admMonths.map(mes => { const c = adm.chamados.find(r => r.mes === mes); return { mes, valor: c?.total ? c.solucionados / c.total * 100 : 0 }; }), icon: CheckCircle2 },
    { label: "Custo Uber", value: money(total(uber)), note: "Acumulado 2026", points: uber, icon: Car },
    { label: "Corridas Uber", value: formatInt(total(corridas)), note: "Acumulado 2026", points: corridas, icon: Car },
    { label: "Ticket médio Uber", value: money(total(corridas) ? total(uber) / total(corridas) : 0), note: "Custo por corrida · acumulado 2026", points: uber.map((r, i) => ({ mes: r.mes, valor: corridas[i]?.valor ? r.valor / (corridas[i]?.valor ?? 1) : 0 })), icon: Tickets, accent: true },
    { label: "Custo Viagens", value: money(total(viagens)), note: "Acumulado 2026", points: viagens, icon: Plane, accent: true },
    { label: "Quantidade de Viagens", value: qtyTravel ? formatInt(qtyTravel) : "—", note: "Acumulado 2026", points: [], icon: Plane },
    { label: "Ticket médio Viagens", value: qtyTravel ? money(total(viagens) / qtyTravel) : "—", note: "Custo por viagem · acumulado 2026", points: [], icon: Tickets },
  ];

  useEffect(() => {
    const onFullscreen = () => { if (!document.fullscreenElement) setPresenting(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPresenting(false); };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onFullscreen); document.removeEventListener("keydown", onKey); };
  }, []);

  async function togglePresentation() {
    if (presenting) {
      setPresenting(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      return;
    }
    setPresenting(true);
    await container.current?.requestFullscreen?.().catch(() => { /* Layout presentation also works without fullscreen permission. */ });
  }

  const isHealth = sector === "SAUDE";
  const months = isHealth ? healthMonths : admMonths;
  const segments = isHealth ? health.segmentos : [...new Set(adm.viagens.map(r => r.segmento))];
  const segmentChart = months.map(mes => ({ mes, ...Object.fromEntries(segments.map(s => [s, isHealth ? Number(health.atestadoMedico.find(r => r.mes === mes)?.[s] ?? 0) : adm.viagens.filter(r => r.mes === mes && r.segmento === s).reduce((a, r) => a + r.valor, 0)])) }));
  const evolution = isHealth ? atendimento : chamados;

  return (
    <div ref={container} className={`dashboard-demo min-h-screen bg-background text-foreground ${dark ? "demo-dark" : ""} ${presenting ? "demo-presenting" : ""}`}>
      {!presenting && <div className="border-b bg-muted/50"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-5 py-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-secondary" />Prévia visual · 2026</span><Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft />Painel original</Link></Button></div></div>}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-5 py-6 sm:px-8">
          <div className="flex items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Activity className="size-6" /></div><div><p className="text-xs font-semibold uppercase text-primary">Bravante · Indicadores de gestão</p><h1 className="mt-1 text-2xl font-semibold">{isHealth ? "Saúde Ocupacional" : "Administrativo"}</h1></div></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="icon" title={dark ? "Tema claro" : "Tema escuro"} aria-label={dark ? "Tema claro" : "Tema escuro"} onClick={() => setDark(v => !v)}>{dark ? <Sun /> : <Moon />}</Button><Button variant={presenting ? "outline" : "default"} onClick={togglePresentation}>{presenting ? <Minimize2 /> : <Maximize2 />}{presenting ? "Sair da apresentação" : "Apresentar"}</Button></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] space-y-7 px-5 py-7 sm:px-8">
        {!presenting && <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5"><div className="flex gap-2" role="group" aria-label="Setor"><Button onClick={() => setSector("SAUDE")} variant={isHealth ? "default" : "outline"} aria-pressed={isHealth}><Stethoscope />Saúde</Button><Button onClick={() => setSector("ADMINISTRATIVO")} variant={!isHealth ? "default" : "outline"} aria-pressed={!isHealth}><Headset />Administrativo</Button></div><span className="text-sm text-muted-foreground">2026 · Todos os segmentos</span></div>}
        <section aria-labelledby="overview"><div className="mb-5 flex flex-wrap items-end justify-between gap-2"><div><h2 id="overview" className="text-lg font-semibold">Visão Executiva</h2><p className="mt-1 text-xs text-muted-foreground">Acumulado 2026 · Evolução mensal {months[0] ?? "—"}–{months.at(-1) ?? "—"}</p></div><span className="text-xs text-muted-foreground">{isHealth ? "Saúde & Segurança" : "Eficiência administrativa"}</span></div>
          {isHealth ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{healthCards.map(card => <DemoKpi key={card.label} {...card} />)}</div> : <div className="space-y-4"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{admCards.slice(0, 2).map(card => <DemoKpi key={card.label} {...card} />)}</div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{admCards.slice(2, 5).map(card => <DemoKpi key={card.label} {...card} />)}</div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{admCards.slice(5).map(card => <DemoKpi key={card.label} {...card} />)}</div></div>}
        </section>
        <section className="grid min-w-0 gap-7 lg:grid-cols-2" aria-label="Evolução dos indicadores">
          <div className="min-w-0 border-t pt-5"><h2 className="font-semibold">{isHealth ? "Atendimentos de saúde" : "Chamados administrativos"}</h2><p className="mb-5 mt-1 text-xs text-muted-foreground">Evolução mensal · 2026</p><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={evolution} margin={{ left: 0, right: 15, top: 10, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="mes" interval={0} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis width={45} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={chartTooltip} formatter={(v: number) => [formatInt(v), isHealth ? "Atendimentos" : "Chamados"]} /><Line dataKey="valor" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div>
          <div className="min-w-0 border-t pt-5"><h2 className="font-semibold">{isHealth ? "Atestados por segmento" : "Custo Viagens por segmento"}</h2><p className="mb-5 mt-1 text-xs text-muted-foreground">Distribuição mensal · 2026</p><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={segmentChart}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="mes" interval={0} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis width={50} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)} /><Tooltip contentStyle={chartTooltip} itemSorter={item => -Number(item.value ?? 0)} formatter={(v: number) => isHealth ? formatInt(v) : money(v)} /><Legend wrapperStyle={{ fontSize: 10 }} />{segments.map(s => <Bar key={s} dataKey={s} stackId="segments" fill={segColor(s)} isAnimationActive={false} />)}</BarChart></ResponsiveContainer></div></div>
        </section>
        <footer className="border-t py-4 text-xs text-muted-foreground">Bravante · {isHealth ? "Saúde Ocupacional" : "Administrativo"} · 2026</footer>
      </main>
    </div>
  );
}