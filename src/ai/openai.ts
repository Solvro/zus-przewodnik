import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ExtractedCase } from "./case-mapping";
import type { CorpusDoc } from "./corpus";
import { selectChunks } from "./retrieval";

/**
 * Dostawca AI: OpenAI (Responses API) — używany, gdy na serwerze jest OPENAI_API_KEY, a nie ma klucza Claude.
 * Te same zadania i zasady co przy Claude: AI czyta dokumenty i objaśnia; kwoty i prawo liczy silnik reguł.
 */
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.5"; // odczyt dokumentów — najdokładniejszy
export const OPENAI_MODEL_FAST = process.env.OPENAI_MODEL_FAST ?? "gpt-5.4-mini"; // asystent, prosty język

let client: OpenAI | null = null;

export function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAI() {
  client ??= new OpenAI({ maxRetries: 2, timeout: 120_000 });
  return client;
}

/* ───────── Odczyt dokumentów (structured outputs) ───────── */

export async function extractCaseOpenAI(
  system: string,
  docs: { name: string; mediaType: string; base64: string }[],
): Promise<ExtractedCase> {
  const content: OpenAI.Responses.ResponseInputContent[] = docs.map((d) =>
    d.mediaType === "application/pdf"
      ? { type: "input_file", filename: d.name, file_data: `data:application/pdf;base64,${d.base64}` }
      : { type: "input_image", image_url: `data:${d.mediaType};base64,${d.base64}`, detail: "high" },
  );
  content.push({
    type: "input_text",
    text: `Odczytaj dane z ${docs.length} dokument(ów) sprawy (${docs.map((d) => d.name).join(", ")}).`,
  });

  const response = await getOpenAI().responses.parse({
    model: OPENAI_MODEL,
    input: [
      { role: "developer", content: system },
      { role: "user", content },
    ],
    reasoning: { effort: "medium" },
    text: { format: zodTextFormat(ExtractedCase, "extracted_case") },
  });
  if (!response.output_parsed) throw new Error("Nie udało się odczytać danych w oczekiwanym formacie.");
  return response.output_parsed;
}

/* ───────── Asystent (strumień + cytaty) ───────── */

const CITE_MARK = "<<<CYTATY>>>";

const CITE_RULES = `
Na samym końcu odpowiedzi dodaj linię ${CITE_MARK}, a pod nią tablicę JSON z 1–4 dosłownymi cytatami ze źródeł, na których się opierasz:
[{"document": "<dokładny tytuł dokumentu>", "text": "<dosłowny fragment, maks. 300 znaków>"}]
Cytuj tylko teksty, które naprawdę występują w dokumentach (przepisz je znak w znak). Znacznik i cytaty są obowiązkowe; jeśli nie korzystałeś ze źródeł, wpisz [].
Nie proponuj na końcu kolejnych tematów („Jeśli chcesz, mogę…”).`;

export interface StreamResult {
  citations: { document: string; text: string }[];
  refused: boolean;
}

/**
 * Strumień odpowiedzi: tekst trafia do onText na bieżąco, a sekcja cytatów (po znaczniku) jest
 * odcinana i zwracana osobno. Do modelu trafiają tylko fragmenty źródeł dobrane do pytania (retrieval.ts).
 */
export async function streamAnswerOpenAI(
  system: string,
  corpus: CorpusDoc[],
  history: { role: "user" | "assistant"; content: string }[],
  planText: string,
  onText: (delta: string) => void,
): Promise<StreamResult> {
  const [first, ...rest] = history;
  // Fragmenty źródeł dobrane do całej rozmowy (ostatnie pytanie ma największą wagę — jest powtórzone)
  const query = `${history.map((t) => t.content).join(" ")} ${history.at(-1)!.content}`;
  const chunks = selectChunks(corpus, query);
  const sources = chunks.map((c) => `<fragment dokument="${c.title}">\n${c.text}\n</fragment>`).join("\n\n");
  const reminder = `\n\n(Odpowiedz zgodnie z zasadami i zakończ sekcją ${CITE_MARK}.)`;
  const turns = [{ ...first, content: `${planText}\n\nPytanie: ${first.content}` }, ...rest];
  const input: OpenAI.Responses.ResponseInputItem[] = [
    { role: "developer", content: `${system}\n${CITE_RULES}` },
    { role: "developer", content: `Fragmenty dokumentów źródłowych:\n\n${sources || "(brak pasujących fragmentów)"}` },
    ...turns.map(
      (t, i) => ({ role: t.role, content: i === turns.length - 1 ? t.content + reminder : t.content }) as OpenAI.Responses.ResponseInputItem,
    ),
  ];

  const stream = await getOpenAI().responses.create({
    model: OPENAI_MODEL_FAST,
    input,
    reasoning: { effort: "medium" },
    stream: true,
  });

  // Bufor: nie wysyłamy fragmentu, który może być początkiem znacznika cytatów
  let pending = "";
  let full = "";
  let marked = false;
  let refused = false;
  for await (const ev of stream) {
    if (ev.type === "response.output_text.delta") {
      full += ev.delta;
      if (marked) continue;
      pending += ev.delta;
      const at = pending.indexOf(CITE_MARK);
      if (at >= 0) {
        if (at > 0) onText(pending.slice(0, at));
        pending = "";
        marked = true;
        continue;
      }
      const safe = pending.length - (CITE_MARK.length - 1);
      if (safe > 0) {
        onText(pending.slice(0, safe));
        pending = pending.slice(safe);
      }
    } else if (ev.type === "response.refusal.delta") {
      refused = true;
    }
  }
  if (!marked && pending) onText(pending);

  return { citations: parseCitations(full, corpus), refused };
}

function parseCitations(full: string, corpus: CorpusDoc[]) {
  const at = full.indexOf(CITE_MARK);
  if (at < 0) return [];
  try {
    const raw = JSON.parse(full.slice(at + CITE_MARK.length).trim().replace(/^```json|```$/g, "")) as {
      document?: string;
      text?: string;
    }[];
    // Porównanie odporne na łamanie wierszy i dzielenie wyrazów z PDF („unie-\nmożliwiający”)
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/-\s*\n\s*/g, "")
        .replace(/[^a-ząćęłńóśźż0-9]/g, "");
    const haystack = corpus.map((d) => norm(d.text));
    return raw
      .filter((c) => c.text && c.document)
      // Zostawiamy tylko cytaty, które faktycznie występują w korpusie (bez „zmyślonych” źródeł)
      .filter((c) => {
        const needle = norm(c.text!).slice(0, 50);
        return needle.length >= 15 && haystack.some((h) => h.includes(needle));
      })
      .slice(0, 6)
      .map((c) => ({ document: c.document!, text: c.text!.trim().slice(0, 400) }));
  } catch {
    return [];
  }
}

/* ───────── Prosty język ───────── */

export async function plainLanguageOpenAI(system: string, text: string): Promise<string> {
  const r = await getOpenAI().responses.create({
    model: OPENAI_MODEL_FAST,
    input: [
      { role: "developer", content: system },
      { role: "user", content: text },
    ],
    reasoning: { effort: "low" },
  });
  return r.output_text.trim();
}
