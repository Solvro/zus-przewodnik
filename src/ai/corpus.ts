import "server-only";
import fs from "node:fs";
import path from "node:path";
import { KNOWLEDGE } from "./knowledge";

export interface CorpusDoc {
  title: string;
  text: string;
}

const TITLES: Record<string, string> = {
  "01-poradnik-zus-2026.txt": "Poradnik dla rodziców i opiekunów dzieci, ZUS 2026",
  "02-ustawa-zasilkowa.txt": "Ustawa o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa (wyciąg)",
  "03-kodeks-pracy.txt": "Kodeks pracy (wyciąg) — uprawnienia związane z rodzicielstwem",
  "04-zalacznik-wymiary-stawki.txt": "Załącznik: maksymalny czas trwania zasiłków, wysokość, podstawa wymiaru",
};

let cached: CorpusDoc[] | null = null;

/**
 * Korpus asystenta: materiały źródłowe z data/corpus (budowane skryptem, poza repozytorium),
 * a gdy ich brak — własna, zwięzła baza wiedzy projektu.
 */
export function loadCorpus(): CorpusDoc[] {
  if (cached) return cached;
  const dir = path.join(process.cwd(), "data", "corpus");
  let docs: CorpusDoc[] = [];
  try {
    docs = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".txt"))
      .sort()
      .map((f) => ({ title: TITLES[f] ?? f, text: fs.readFileSync(path.join(dir, f), "utf8").trim() }))
      .filter((d) => d.text.length > 0);
  } catch {
    docs = [];
  }
  cached = docs.length ? docs : [{ title: "Baza wiedzy Rodzicownika (reguły 2026)", text: KNOWLEDGE }];
  return cached;
}
