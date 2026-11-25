import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import type { AdmData, ViagemRow, ViagemTabela } from "@/lib/adm-store";

const PALETTE = ["#007A4D", "#EAA921", "#3BA27E", "#F2B844", "#5CAF8F", "#F8C66B", "#87C3A9", "#FFD796", "#4E7F71", "#B6B6B6"];
const tip = { backgroundColor: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const kfmt = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v)));
const n = (v: unknown) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/\./g, "").replace(",", ".")) || 0);
const isNum = (v: unknown) => typeof v === "number";

const tab = (d: AdmData, aba: string) => d.viagensTabelas?.find((t) => t.aba === aba);
/** Linhas de dados (ignora linhas vazias, totais e notas). */
const dataRows = (t?: ViagemTabela) => (t?.linhas ?? []).filter((r) => r[0] !== null && r[1] !== null && !String(r[0]).toUpperCase().startsWith("TOTAL"));

function Card({ title, subtitle, children, className = "", h = "h-72" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string; h?: string }) {
  return (
    <div data-indicator={title} className={`rounded-xl border bg-card p-4 shadow-sm break-inside-avoid min-w-0 ${className}`}>
      <div className="mb-3 border-l-4 border-primary pl-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className={`w-full ${h}`}>{children}</div>
    </div>
  );
}
function Mini({ label, value, sub, yellow }: { label: string; value: string; sub?: string; yellow?: boolean }) {
  return (
    <div data-indicator={label} className="kpi-card rounded-xl border bg-card p-4 shadow-sm min-w-0 break-inside-avoid">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="kpi-value mt-1 break-words text-2xl font-bold" style={{ color: yellow ? "var(--secondary)" : "var(--primary)" }}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
function fmtCell(h: string, v: string | number | null) {
  if (v === null) return "";
  if (typeof v !== "number") return v;
  if (/R\$/.test(h)) return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (/%/.test(h) || /desconto/i.test(h)) return `${(v <= 1 && !/\(%\)/.test(h) ? v * 100 : v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  if (/posi/i.test(h) || /centro/i.test(h)) return String(v);
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
function RankTable({ t }: { t: ViagemTabela }) {
  const rows = t.linhas.filter((r) => r.some((v) => v !== null));
  return (
    <div data-indicator={t.titulo} className="rounded-xl border bg-card p-4 shadow-sm break-inside-avoid min-w-0">
      <div className="mb-3 border-l-4 border-primary pl-3"><h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{t.titulo}</h3><p className="text-xs text-muted-foreground">Acumulado da planilha base</p></div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b text-left text-muted-foreground">{t.cabecalho.map((h) => <th key={h} className="px-2 py-1.5 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => r.filter((v) => v !== null).length === 1 && !isNum(r[0])
            ? <tr key={i}><td colSpan={t.cabecalho.length} className="px-2 pt-2 text-[11px] italic text-muted-foreground">{r[0]}</td></tr>
            : <tr key={i} className="border-b border-border/60 last:border-0">{t.cabecalho.map((h, j) => <td key={j} className={`px-2 py-1.5 ${isNum(r[j]) && j > 0 ? "text-right tabular-nums" : ""} ${j === 1 ? "font-medium text-foreground" : ""}`}>{fmtCell(h, r[j] ?? null)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function SavingHighlight({ t }: { t?: ViagemTabela }) {
  const rows = dataRows(t).filter((r) => typeof r[1] === "number");
  if (!t || !rows.length) return null;
  const parse = (v: unknown) => { const m = String(v ?? "").match(/[\d.,]+/); return m ? Number(m[0].replace(/\./g, "").replace(",", ".")) : 0; };
  const unit = String(rows[0]?.[2] ?? "").replace(/^[\s\d.,R$]+/, "").trim();
  const total = rows.reduce((a, r) => a + parse(r[2]), 0);
  const periodo = String(rows[0]?.[3] ?? "");
  return (
    <section data-indicator="Saving em passagens aéreas" className="relative overflow-hidden rounded-2xl border-2 border-primary bg-primary p-5 text-primary-foreground shadow-lg break-inside-avoid">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/30 blur-2xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 animate-bounce items-center justify-center rounded-full bg-secondary text-3xl font-black text-secondary-foreground shadow-md">▼</div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-90">Destaque • Redução de custo</div>
            <div className="text-lg font-semibold">Saving em passagens aéreas {periodo && `(${periodo})`}</div>
            <div className="mt-1 text-4xl font-black tracking-tight md:text-5xl">{total.toLocaleString("pt-BR")}{unit && ` ${unit}`}</div>
            <div className="text-xs opacity-90">economizados com descontos negociados</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={String(r[0])} className="rounded-xl bg-primary-foreground/15 px-4 py-3 backdrop-blur">
              <div className="text-sm font-bold">{String(r[0])}</div>
              <div className="text-2xl font-black">▼ {(n(r[1]) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</div>
              <div className="text-xs opacity-90">desconto médio • saving {String(r[2] ?? "")}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const RANKINGS = ["TOP 10 Trechos", "TOP 10 Hotéis", "TOP 10 Locadoras", "TOP 10 Centros Custo", "TOP 10 VIAJANTES AÉREO", "TOP 10 VIAJANTES HOTEL", "TOP 10 VIAJANTES CARRO", "Fora Política AÉREO", "Fora Política HOTEL", "Carro Fora 48 Horas"];

export function ViagensSection({ data, via, meses, sub, children }: { data: AdmData; via: ViagemRow[]; meses: string[]; sub: string; children?: React.ReactNode }) {
  const sumBy = (k: (r: ViagemRow) => string) => {
    const m = new Map<string, number>();
    via.forEach((r) => m.set(k(r), (m.get(k(r)) ?? 0) + r.valor));
    return [...m.entries()].map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);
  };
  const produtos = sumBy((r) => r.produto);
  const classe = new Map(dataRows(tab(data, "CONSOLIDADO PRODUTO GERAL")).map((r) => [String(r[0]), String(r[3] ?? "Outros produtos/serviços")]));
  const porClasse = sumBy((r) => classe.get(r.produto) ?? "Outros produtos/serviços");
  const top5 = produtos.slice(0, 5).map((p) => p.name);
  const porMes = meses.map((mes) => {
    const o: Record<string, string | number> = { mes };
    produtos.forEach((p) => (o[p.name] = +via.filter((r) => r.mes === mes && r.produto === p.name).reduce((a, r) => a + r.valor, 0).toFixed(2)));
    return o;
  });
  const total = via.reduce((a, r) => a + r.valor, 0);
  const cls = (c: string) => porClasse.find((x) => x.name === c)?.value ?? 0;
  const ant = dataRows(tab(data, "Resumo Antecedência"));
  const antSvc = (s: string) => ant.find((r) => String(r[0]).toUpperCase() === s);
  const aereo = antSvc("AÉREO"), hotel = antSvc("HOTEL");
  const sorter = (i: { value?: unknown }) => -n(i.value);
  const rankings = RANKINGS.map((a) => tab(data, a)).filter((t): t is ViagemTabela => !!t);

  return (
    <div className="space-y-6">
      {children}
      <SavingHighlight t={tab(data, "Saving Aéreo Jan-Out")} />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="Passagens Aéreas" value={brl(cls("Passagens aéreas"))} sub={total ? `${((cls("Passagens aéreas") / total) * 100).toFixed(1)}% do custo de viagens` : undefined} />
        <Mini label="Hospedagem" value={brl(cls("Hospedagem"))} sub={total ? `${((cls("Hospedagem") / total) * 100).toFixed(1)}% do custo de viagens` : undefined} yellow />
        <Mini label="Locação de Veículos" value={brl(cls("Locação de veículos"))} sub={total ? `${((cls("Locação de veículos") / total) * 100).toFixed(1)}% do custo de viagens` : undefined} />
        <Mini label="Outros Produtos/Serviços" value={brl(cls("Outros produtos/serviços"))} sub={total ? `${((cls("Outros produtos/serviços") / total) * 100).toFixed(1)}% do custo de viagens` : undefined} yellow />
      </section>
      {(aereo || hotel) && <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {aereo && <Mini label="Aéreo fora da política de 30 dias" value={`${n(aereo[5]).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} sub={`${n(aereo[3]).toLocaleString("pt-BR")} de ${n(aereo[2]).toLocaleString("pt-BR")} emissões • ${brl(n(aereo[8]))} fora • antecedência média ${n(aereo[6]).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`} />}
        {hotel && <Mini label="Hotel fora da política de 30 dias" value={`${n(hotel[5]).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} sub={`${n(hotel[3]).toLocaleString("pt-BR")} de ${n(hotel[2]).toLocaleString("pt-BR")} reservas • ${brl(n(hotel[8]))} fora • antecedência média ${n(hotel[6]).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`} yellow />}
      </section>}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Custo com Viagens por Mês" subtitle={`${sub} • por produto (sem divisão por segmento)`}>
          <ResponsiveContainer><BarChart data={porMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="mes" tick={{ fontSize: 11 }} interval={0} /><YAxis tick={{ fontSize: 11 }} tickFormatter={kfmt} />
            <Tooltip itemSorter={sorter} contentStyle={tip} formatter={(v: number) => brl(v)} /><Legend wrapperStyle={{ fontSize: 10 }} />
            {[...produtos].reverse().map((p) => <Bar key={p.name} dataKey={p.name} stackId="a" fill={PALETTE[produtos.indexOf(p) % PALETTE.length]} />)}
          </BarChart></ResponsiveContainer>
        </Card>
        <Card title="Viagens por Produto (Top 5)" subtitle={sub}>
          <ResponsiveContainer><LineChart data={porMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="mes" tick={{ fontSize: 11 }} interval={0} /><YAxis tick={{ fontSize: 11 }} tickFormatter={kfmt} />
            <Tooltip itemSorter={sorter} contentStyle={tip} formatter={(v: number) => brl(v)} /><Legend wrapperStyle={{ fontSize: 11 }} />
            {top5.map((p, i) => <Line key={p} type="monotone" dataKey={p} stroke={PALETTE[i]} strokeWidth={2} dot={{ r: 3 }} />)}
          </LineChart></ResponsiveContainer>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Viagens por Classificação" subtitle={sub}>
          <ResponsiveContainer><PieChart>
            <Pie data={porClasse} dataKey="value" nameKey="name" innerRadius={45} outerRadius={90} paddingAngle={2}>{porClasse.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie>
            <Tooltip itemSorter={sorter} contentStyle={tip} formatter={(v: number) => `${brl(v)} (${total ? ((v / total) * 100).toFixed(1) : 0}%)`} /><Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart></ResponsiveContainer>
        </Card>
        <Card title="Viagens por Produto" subtitle={sub} className="lg:col-span-2">
          <ResponsiveContainer><BarChart data={produtos} margin={{ bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" /><YAxis tick={{ fontSize: 11 }} tickFormatter={kfmt} />
            <Tooltip contentStyle={tip} formatter={(v: number) => brl(v)} /><Bar dataKey="value" name="Valor" fill="#EAA921" radius={[4, 4, 0, 0]} />
          </BarChart></ResponsiveContainer>
        </Card>
      </section>

      {rankings.length > 0 && <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">{rankings.map((t) => <RankTable key={t.aba} t={t} />)}</section>}
    </div>
  );
}
