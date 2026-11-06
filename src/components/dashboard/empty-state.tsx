import { Download, FileSpreadsheet, Upload } from "lucide-react";

export function DashboardEmptyState({
  setorLabel,
  ano,
  onImportClick,
  onExportTemplate,
}: {
  setorLabel: string;
  ano: string;
  onImportClick: () => void;
  onExportTemplate: () => void;
}) {
  return (
    <div className="mx-auto my-8 max-w-xl rounded-2xl border border-dashed border-primary/40 bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FileSpreadsheet className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-foreground">
        Nenhum dado preenchido para {setorLabel} • {ano}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Este recorte ainda está com valores zerados. Baixe o modelo Excel padrão para preencher os
        indicadores mensais ou importe uma planilha já atualizada para visualizar os gráficos e
        destaques executivos.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onImportClick}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Importar Planilha Excel
        </button>
        <button
          type="button"
          onClick={onExportTemplate}
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm transition-colors hover:bg-primary/5 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Baixar Template ({ano})
        </button>
      </div>
    </div>
  );
}
