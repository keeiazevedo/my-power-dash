// Cor fixa por segmento, compartilhada entre Saúde e Administrativo.
export const SEGMENT_COLORS: Record<string, string> = {
  AMBIENTAL: "#007A4D",
  BUNKER: "#EAA921",
  OFFSHORE: "#87C3A9",
  ESTALEIRO: "#4E7F71",
  CORPORATIVO: "#B6B6B6",
};
const EXTRA = ["#F8C66B", "#3BA27E", "#FFD796", "#5CAF8F", "#F2B844"];
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
export function segColor(name: string): string {
  const k = norm(String(name ?? ""));
  if (SEGMENT_COLORS[k]) return SEGMENT_COLORS[k];
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return EXTRA[h % EXTRA.length]!;
}
