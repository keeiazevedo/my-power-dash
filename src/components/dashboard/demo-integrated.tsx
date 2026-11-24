import { useState } from "react";
import { CheckCircle2, CircleAlert, SlidersHorizontal, Target, Stethoscope, Headset, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemoKpi, type DemoMetric } from "./demo-kpi";
import { demoGoalStatus, type GoalDirection } from "@/lib/demo-goals";

export type IntegratedMetric = DemoMetric & { actual: number; goalKey?: string; direction?: GoalDirection; unit?: string };
const initialGoals: Record<string, string> = { aso: "90", cat: "60", resolution: "95", uber: "", travel: "" };
const goalLabels: Record<string, string> = { aso: "Adesão ASO mínima (%)", cat: "Limite anual de CAT", resolution: "Resolução mínima (%)", uber: "Orçamento anual Uber (R$)", travel: "Orçamento anual Viagens (R$)" };

export function DemoIntegrated({ health, adm, healthPeriod, admPeriod }: { health: IntegratedMetric[]; adm: IntegratedMetric[]; healthPeriod: string; admPeriod: string }) {
  const [goals, setGoals] = useState(initialGoals);
  const [editing, setEditing] = useState(false);
  function metricCard(metric: IntegratedMetric) {
    const raw = metric.goalKey ? goals[metric.goalKey] : "";
    const target = raw?.trim() ? Number(raw) : null;
    const status = demoGoalStatus(metric.actual, target, metric.direction ?? "maximum");
    const Icon = status === "met" ? CheckCircle2 : status === "unset" ? Minus : CircleAlert;
    const tone = status === "met" ? "text-primary" : status === "attention" ? "text-secondary" : status === "alert" ? "text-destructive" : "text-muted-foreground";
    const label = status === "met" ? "Dentro da meta ilustrativa" : status === "attention" ? "Atenção · próximo da meta" : status === "alert" ? "Fora da meta ilustrativa" : "Sem meta definida";
    return <DemoKpi key={metric.label} {...metric}><div className={`flex items-center gap-2 text-xs font-medium ${tone}`}><Icon className="size-4 shrink-0" /><span>{label}</span></div>{target !== null && target > 0 && <p className="mt-1 pl-6 text-[11px] text-muted-foreground">{metric.direction === "minimum" ? "Mínimo" : "Limite"}: {target.toLocaleString("pt-BR")} {metric.unit ?? ""}</p>}</DemoKpi>;
  }
  return <section className="space-y-7" aria-label="Visão integrada da coordenação">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5"><div><p className="text-xs font-semibold uppercase text-primary">Panorama da coordenação</p><h2 className="mt-2 text-2xl font-semibold">Duas frentes. Uma visão.</h2><p className="mt-2 text-sm text-muted-foreground">2026 · Todos os segmentos · Acumulado até os últimos dados disponíveis</p></div><Button variant="outline" onClick={() => setEditing(v => !v)} aria-expanded={editing}><SlidersHorizontal />{editing ? "Fechar metas" : "Ajustar metas"}</Button></div>
    <div className="flex items-start gap-3 border-l-2 border-secondary bg-secondary/10 px-4 py-3 text-xs leading-5"><Target className="mt-0.5 size-4 shrink-0 text-secondary" /><p><strong>Simulação de metas</strong> · Valores dos indicadores são reais; metas e faixas dos semáforos são ilustrativas, não aprovadas pela diretoria.</p></div>
    {editing && <div className="border-y py-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(goalLabels).map(([key, label]) => <label key={key} className="space-y-2 text-xs font-medium"><span>{label}</span><Input type="number" min="0" step="any" value={goals[key] ?? ""} placeholder="Não definido" onChange={e => setGoals(g => ({ ...g, [key]: e.target.value }))} /></label>)}</div><p className="mt-3 text-xs text-muted-foreground">Faixa amarela: até 10% de distância da meta. Alterações temporárias nesta prévia.</p></div>}
    <section aria-labelledby="integrated-health"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 id="integrated-health" className="flex items-center gap-2 font-semibold"><Stethoscope className="size-5 text-primary" />Saúde & Segurança</h3><span className="text-xs text-muted-foreground">{healthPeriod}</span></div><div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">{health.map(metricCard)}</div></section>
    <section aria-labelledby="integrated-adm"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 id="integrated-adm" className="flex items-center gap-2 font-semibold"><Headset className="size-5 text-primary" />Administrativo</h3><span className="text-xs text-muted-foreground">{admPeriod}</span></div><div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">{adm.map(metricCard)}</div></section>
  </section>;
}