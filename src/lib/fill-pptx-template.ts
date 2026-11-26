import JSZip from "jszip";

export const PPTX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const MARKER = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;
const SLIDE_PART = /^ppt\/(slides|notesSlides)\/[^/]+\.xml$/;
const XML_INVALID_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

export type FillResult = {
  bytes: Uint8Array;
  /** Marker keys found in the template with no entry in `values`; those markers are left in place. */
  unknownKeys: string[];
};

/** Replaces {{key}} markers in slide and speaker-notes text; every other part of the package stays byte-identical. */
export async function fillPptxTemplate(
  template: ArrayBuffer | Uint8Array,
  values: Record<string, string>,
): Promise<FillResult> {
  const zip = await JSZip.loadAsync(template);
  const unknownKeys = new Set<string>();

  for (const path of Object.keys(zip.files).filter((p) => SLIDE_PART.test(p))) {
    const part = zip.file(path);
    if (!part) continue;
    const xml = await part.async("string");
    const filled = xml.replace(/<a:p>[\s\S]*?<\/a:p>/g, (paragraph) => fillParagraph(paragraph, values, unknownKeys));
    // createFolders: false keeps JSZip from adding directory entries the template never had.
    if (filled !== xml) zip.file(path, filled, { createFolders: false });
  }

  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", mimeType: PPTX_MIME_TYPE });
  return { bytes, unknownKeys: [...unknownKeys] };
}

/** Browser download helper: `downloadPptx(result.bytes, "quote.pptx")`. */
export function downloadPptx(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: PPTX_MIME_TYPE }));
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  link.click();
  // Safari cancels a download whose blob URL is revoked before the save starts.
  setTimeout(() => URL.revokeObjectURL(url), 40_000);
}

type Run = { start: number; end: number; rPr: string; text: string };

// PowerPoint splits typed text across <a:r> runs (spell-check, edits), so a marker can span runs;
// the value lands in the run where the marker starts and keeps that run's formatting.
function fillParagraph(paragraph: string, values: Record<string, string>, unknownKeys: Set<string>) {
  const runs: Run[] = [];
  for (const m of paragraph.matchAll(/<a:r>([\s\S]*?)<\/a:r>/g)) {
    const inner = m[1];
    if (inner === undefined || m.index === undefined) continue;
    const t = inner.match(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>|<a:t\s*\/>/);
    if (!t) continue;
    runs.push({
      start: m.index,
      end: m.index + m[0].length,
      rPr: inner.slice(0, t.index),
      text: decodeXml(t[1] ?? ""),
    });
  }

  // A marker never spans a line break, field, or other non-run element.
  const groups: Run[][] = [];
  for (const run of runs) {
    const group = groups[groups.length - 1];
    const previous = group?.[group.length - 1];
    if (group && previous && paragraph.slice(previous.end, run.start).trim() === "") group.push(run);
    else groups.push([run]);
  }

  const texts = new Map<Run, string>();
  for (const group of groups) {
    const parts = group.map((r) => r.text);
    const joined = parts.join("");
    if (!joined.includes("{{")) continue;

    const locate = (offset: number) => {
      let i = 0;
      while (i < parts.length - 1 && offset >= (parts[i]?.length ?? 0)) offset -= parts[i++]?.length ?? 0;
      return [i, offset] as const;
    };
    const matches = [...joined.matchAll(MARKER)].reverse();
    for (const m of matches) {
      const key = m[1];
      if (key === undefined || m.index === undefined) continue;
      if (!Object.prototype.hasOwnProperty.call(values, key)) {
        unknownKeys.add(key);
        continue;
      }
      const [startRun, startOffset] = locate(m.index);
      const [endRun, endOffset] = locate(m.index + m[0].length - 1);
      const tail = (parts[endRun] ?? '').slice(endOffset + 1);
      for (let i = startRun + 1; i <= endRun; i++) parts[i] = "";
      parts[startRun] = (parts[startRun] ?? '').slice(0, startOffset) + values[key] + (startRun === endRun ? tail : "");
      if (endRun !== startRun) parts[endRun] = tail;
    }
    group.forEach((run, i) => {
      const text = parts[i];
      if (text !== undefined && text !== run.text) texts.set(run, text);
    });
  }

  let out = "";
  let cursor = 0;
  for (const run of runs) {
    const text = texts.get(run);
    if (text === undefined) continue;
    out += paragraph.slice(cursor, run.start) + renderRun(run.rPr, text);
    cursor = run.end;
  }
  return out + paragraph.slice(cursor);
}

// A newline in a value becomes a soft line break, the same <a:br> PowerPoint writes for Shift+Enter.
function renderRun(rPr: string, text: string) {
  return text
    .replace(XML_INVALID_CHARS, "")
    .split(/\r\n|\r|\n/)
    .map((line) => `<a:r>${rPr}<a:t>${encodeXml(line)}</a:t></a:r>`)
    .join(rPr ? `<a:br>${rPr}</a:br>` : "<a:br/>");
}

function encodeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeXml(text: string) {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string,string>)[entity] ?? entity;
  });
}
