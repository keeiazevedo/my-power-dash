/** Status displayed and maintained in the status sheet; limbo has its own dataset. */
export const HEALTH_STATUSES = ["EM ANÁLISE", "APOSENTADO", "ATIVO"];
export function healthStatusRows(rows: Record<string, string | number>[]) {
  return rows.map((row) => ({
    mes: String(row["mes"] ?? ""),
    ...Object.fromEntries(HEALTH_STATUSES.map((status) => [status, Number(row[status] ?? 0)])),
  }));
}
export function normalizeHealthStatuses<
  T extends { statusAfast: string[]; afastamentoStatus: Record<string, string | number>[] },
>(data: T): T {
  return {
    ...data,
    statusAfast: [...HEALTH_STATUSES],
    afastamentoStatus: healthStatusRows(data.afastamentoStatus),
  };
}
