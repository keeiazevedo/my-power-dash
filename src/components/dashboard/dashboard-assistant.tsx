import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Copy, FileText, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { previewAnalysis } from "@/lib/demo-analysis";
import { baseAdm, type AdmData } from "@/lib/adm-store";
import { baseDataFor, type DashboardData } from "@/lib/dashboard-store";
import type { PeriodoId } from "@/lib/dashboard-analytics";
import { findIndicators, type IndicatorEntry } from "@/lib/indicator-search";

type Props = {
  year: string;
  period: PeriodoId;
  segment: string;
  indicators: IndicatorEntry[];
  onNavigate: (tab: string) => void;
} & ({ sector: "SAUDE"; data: DashboardData } | { sector: "ADMINISTRATIVO"; data: AdmData });
export function DashboardAssistant(props: Props) {
  const { year, period, segment, indicators, onNavigate } = props;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState<IndicatorEntry | null>(null);
  const [report, setReport] = useState<{
    signature: string;
    context: string;
    paragraphs: string[];
  } | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLElement>(null);
  const signature = JSON.stringify({
    sector: props.sector,
    year,
    period,
    segment,
    data: props.data,
  });
  const analysis = useMemo(
    () =>
      props.sector === "SAUDE"
        ? previewAnalysis(props.data, baseAdm(year), { sector: "SAUDE", period, segment, year })
        : previewAnalysis(baseDataFor("SAUDE", year), props.data, {
            sector: "ADMINISTRATIVO",
            period,
            segment,
            year,
          }),
    [props.data, props.sector, year, period, segment],
  );
  const results = findIndicators(indicators, query);
  const visibleReport = report?.signature === signature ? report : null;
  const scrollTo = (element: HTMLElement) =>
    element.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!pending) return;
    let frame = 0,
      attempts = 0;
    const root = scopeRef.current?.closest("main");
    const find = () => {
      const target = Array.from(root?.querySelectorAll<HTMLElement>("[data-indicator]") ?? []).find(
        (el) => el.dataset["indicator"] === pending.target && el.getClientRects().length > 0,
      );
      if (target) {
        root
          ?.querySelectorAll("[data-search-highlight]")
          .forEach((el) => el.removeAttribute("data-search-highlight"));
        target.setAttribute("data-search-highlight", "true");
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
        scrollTo(target);
        setPending(null);
      } else if (attempts++ < 60) frame = requestAnimationFrame(find);
      else setPending(null);
    };
    frame = requestAnimationFrame(find);
    return () => cancelAnimationFrame(frame);
  }, [pending]);
  function choose(entry: IndicatorEntry) {
    setOpen(false);
    setQuery("");
    setActive(0);
    onNavigate(entry.tab);
    setPending(entry);
  }
  function generate() {
    setReport({ signature, context: analysis.context, paragraphs: analysis.paragraphs });
    setCopyStatus("");
    requestAnimationFrame(() => {
      if (reportRef.current) scrollTo(reportRef.current);
    });
  }
  async function copy() {
    if (!visibleReport) return;
    try {
      await navigator.clipboard.writeText(
        `Parecer Executivo — Bravante\n${visibleReport.context}\n\n${visibleReport.paragraphs.join("\n\n")}\n\nSíntese automática descritiva · Sujeita à validação da coordenação.`,
      );
      setCopyStatus("Copiado");
    } catch {
      setCopyStatus("Não foi possível copiar. Selecione o texto do parecer.");
    }
  }
  return (
    <div ref={scopeRef} className="space-y-5">
      <div className="presentation-tools no-print flex flex-wrap items-start gap-2">
        <div
          className="relative min-w-0 flex-1 basis-60"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            role="combobox"
            aria-label="Buscar indicador"
            aria-expanded={open}
            aria-controls="dashboard-indicators"
            aria-autocomplete="list"
            aria-activedescendant={
              open && results[active] ? `dashboard-result-${active}` : undefined
            }
            className="h-10 bg-card pl-9 pr-10"
            placeholder="Buscar indicador…"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((v) => Math.max(0, Math.min(v + 1, results.length - 1)));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((v) => Math.max(0, v - 1));
              }
              if (e.key === "Enter") {
                const entry = results[active];
                if (entry) {
                  e.preventDefault();
                  choose(entry);
                }
              }
              if (e.key === "Escape") setOpen(false);
            }}
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Limpar busca"
              className="absolute right-1 top-1 size-8"
              onClick={() => {
                setQuery("");
                setActive(0);
                searchRef.current?.focus();
              }}
            >
              <X />
            </Button>
          )}
          {open && (
            <div
              id="dashboard-indicators"
              role="listbox"
              aria-label="Indicadores encontrados"
              className="absolute inset-x-0 top-12 z-30 max-h-80 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-sm"
            >
              {results.length ? (
                results.map((item, i) => (
                  <Button
                    key={item.label}
                    id={`dashboard-result-${i}`}
                    role="option"
                    aria-selected={i === active}
                    variant="ghost"
                    className={`h-auto w-full justify-between gap-3 whitespace-normal py-3 text-left ${i === active ? "bg-accent" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(item)}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="shrink-0" />
                  </Button>
                ))
              ) : (
                <p className="p-4 text-sm text-muted-foreground">Nenhum indicador encontrado.</p>
              )}
            </div>
          )}
        </div>
        <Button className="h-10" disabled={analysis.empty} onClick={generate}>
          <FileText />
          Gerar Parecer
        </Button>
      </div>
      {report && (
        <section ref={reportRef} aria-labelledby="dashboard-report-title" className="border-y py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="dashboard-report-title"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <FileText className="size-5 text-primary" />
              Parecer Executivo
            </h2>
            <div className="no-print flex items-center gap-2">
              {visibleReport && (
                <Button variant="outline" onClick={copy}>
                  {copyStatus === "Copiado" ? <Check /> : <Copy />}
                  {copyStatus === "Copiado" ? "Copiado" : "Copiar parecer"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar parecer"
                onClick={() => {
                  setReport(null);
                  setCopyStatus("");
                }}
              >
                <X />
              </Button>
            </div>
          </div>
          {visibleReport ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">{visibleReport.context}</p>
              <div aria-live="polite" className="mt-5 max-w-5xl space-y-4 text-sm leading-7">
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
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              Os filtros ou dados mudaram. Gere um novo parecer.
            </p>
          )}
          {visibleReport && copyStatus && (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              {copyStatus}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
