<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep visual experiments on `/demonstracao` with route-local state and scoped styles; the production dashboard and stored datasets must remain unaffected.
- Share presentation/theme state through DashboardExperience and filtered KPI series through KpiSeriesContext; visual enhancements must not write or transform stored datasets.
- Keep health highlight month selection independent of chart period filters and compute descriptive comparisons in health-month-insights; highlight changes must not change KPI totals.
- Keep integrated preview targets in component-local state and classify them through demo-goals; illustrative goals must never become official targets or modify imported datasets.
- Use `demo-analysis` for local descriptive reports in preview and official dashboards; respect year and filters, invalidate stale reports, and never allocate annual-only totals to months or segments.
- Share official search/report controls through `DashboardAssistant` and tab-aware `indicator-search` entries; data-indicator targets let search navigate without changing filters or datasets.
- Apply the shared health-status projection to status charts, spreadsheet import/export, defaults and loaded browser data; keep the separate limbo dataset untouched so legacy files cannot restore removed status series.
- Administrativo travel data lives as `viagensTabelas` (one entry per VIAGENS GERAL sheet, exported/imported verbatim); monthly `viagens` rows are derived from the month-by-month sheet with segment "GERAL", which ignores segment filters like chamados.
