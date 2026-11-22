import type { CorpusDoc } from "./corpus";

/**
 * Prosty wybór fragmentów źródeł do pytania (bez bazy wektorowej): dzielimy dokumenty na akapitowe
 * fragmenty i punktujemy je wspólnymi rdzeniami słów (pierwsze 5 liter — działa dla polskiej fleksji).
 * Używane z OpenAI, gdzie zbyt długi kontekst bywa po cichu obcinany.
 */
export interface Chunk {
  title: string;
  text: string;
}

const STOP = new Set(["jest", "przez", "oraz", "jeśli", "jeżeli", "który", "która", "które", "czy", "może", "mogę", "jaki", "jaka", "jakie", "kiedy", "tego", "temu", "dla", "nie", "się"]);

const stems = (s: string) =>
  s
    .toLowerCase()
    .replace(/-\s*\n\s*/g, "")
    .split(/[^a-ząćęłńóśźż0-9]+/)
    .filter((w) => w.length > 3 && !STOP.has(w))
    .map((w) => w.slice(0, 5));

let cache: { key: CorpusDoc[]; chunks: (Chunk & { stems: Set<string> })[] } | null = null;

function chunksOf(corpus: CorpusDoc[]) {
  if (cache?.key === corpus) return cache.chunks;
  const out: (Chunk & { stems: Set<string> })[] = [];
  for (const d of corpus) {
    let buf = "";
    for (const para of d.text.split(/\n\s*\n|\f/)) {
      if (buf.length + para.length > 1800 && buf) {
        out.push({ title: d.title, text: buf.trim(), stems: new Set(stems(buf)) });
        buf = "";
      }
      buf += `${para}\n`;
    }
    if (buf.trim()) out.push({ title: d.title, text: buf.trim(), stems: new Set(stems(buf)) });
  }
  cache = { key: corpus, chunks: out };
  return out;
}

/** Najtrafniejsze fragmenty (w kolejności z dokumentu), łącznie do `budget` znaków. */
export function selectChunks(corpus: CorpusDoc[], question: string, budget = 60_000): Chunk[] {
  const q = [...new Set(stems(question))];
  const all = chunksOf(corpus);
  if (!q.length) return all.slice(0, 0);
  const scored = all
    .map((c, i) => ({ c, i, score: q.reduce((s, w) => s + (c.stems.has(w) ? 1 : 0), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const picked: typeof scored = [];
  let used = 0;
  for (const x of scored) {
    if (used + x.c.text.length > budget) continue;
    picked.push(x);
    used += x.c.text.length;
  }
  return picked.sort((a, b) => a.i - b.i).map(({ c }) => ({ title: c.title, text: c.text }));
}
