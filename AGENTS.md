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
