import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { FALLBACK, MODEL, aiProvider, getClient } from "./client";
import { plainLanguageOpenAI, streamAnswerOpenAI } from "./openai";
import { loadCorpus } from "./corpus";
import { KNOWLEDGE } from "./knowledge";
import type { CalculationResult } from "@/engine/types";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Citation {
  document: string;
  text: string;
}

export const SYSTEM = `Jesteś asystentem „Rodzicownika” — pomagasz przyszłym i świeżym rodzicom zrozumieć świadczenia z ZUS: zasiłek chorobowy w ciąży, zasiłek macierzyński (urlop macierzyński, rodzicielski, ojcowski, uzupełniający, przysposobienie), terminy i dokumenty.

Zasady odpowiedzi:
- Odpowiadaj po polsku, prostym językiem, zwracając się na „Ty”. Krótko: zwykle 2–6 zdań lub krótka lista.
- Opieraj się na załączonych dokumentach źródłowych i cytuj je. Jeśli w źródłach nie ma odpowiedzi, powiedz to wprost i wskaż, gdzie zapytać (ZUS przez eZUS, infolinia ZUS, pracodawca).
- Nie wyliczaj kwot ani dat samodzielnie. Jeśli pytanie dotyczy kwot lub terminów użytkownika, użyj wyłącznie wartości z sekcji „Plan użytkownika” (wyliczył je silnik reguł). Jeśli tych danych brak, poproś o uzupełnienie kalkulatora.
- Nie składaj obietnic w imieniu ZUS — ostateczną decyzję wydaje ZUS lub płatnik składek.
- Przy trudnych tematach (strata dziecka, choroba) pisz z empatią i spokojnie, bez formułek.`;

/** Zwięzły opis planu użytkownika z wyniku silnika — jedyne źródło kwot i dat dla modelu. */
export function planContext(r: CalculationResult | null): string {
  if (!r) return "Plan użytkownika: brak danych (użytkownik nie wypełnił jeszcze kalkulatora).";
  const lines = [
    `Plan użytkownika (wyliczony przez silnik reguł, parametry ${r.paramsId}, zdarzenie ${r.scenarioEvent}, data ${r.eventDate ?? "brak"}):`,
    ...r.eligibility.map((e) => `- [${e.status}] ${e.title}: ${e.reasons.join(" ")}`),
    `Okresy zasiłku:`,
    ...r.segments.map((s) => `- ${s.parent === "mother" ? "mama" : "tata"}: ${s.label}, ${s.start}–${s.end}, ${Math.round(s.rate * 1000) / 10}%, ${s.monthlyAmount.toFixed(2)} zł/mies. brutto, razem ${s.total.toFixed(2)} zł, wypłaca ${s.paidBy}`),
    `Suma brutto: ${r.totals.all.toFixed(2)} zł (netto szacunkowo ${r.totals.netEstimate.toFixed(2)} zł).`,
    `Terminy:`,
    ...r.deadlines.map((d) => `- ${d.date}: ${d.title}${d.passed ? " (minął)" : ""}`),
    `Ryzyka:`,
    ...r.risks.map((x) => `- [${x.level}] ${x.title}`),
  ];
  return lines.join("\n");
}

/**
 * Strumień odpowiedzi asystenta. Dokumenty źródłowe są na początku pierwszej wiadomości
 * z punktem cache — kolejne pytania czytają je z pamięci podręcznej (taniej i szybciej).
 */
export function streamAnswer(history: ChatTurn[], plan: CalculationResult | null) {
  const corpus = loadCorpus();
  const docBlocks: Anthropic.Beta.BetaContentBlockParam[] = corpus.map((d, i) => ({
    type: "document",
    title: d.title,
    source: { type: "text", media_type: "text/plain", data: d.text },
    citations: { enabled: true },
    ...(i === corpus.length - 1 ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));

  const [first, ...rest] = history;
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: [...docBlocks, { type: "text", text: `${planContext(plan)}\n\nPytanie: ${first.content}` }],
    },
    ...rest.map((t) => ({ role: t.role, content: t.content })),
  ];

  return getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    ...FALLBACK,
    output_config: { effort: "medium" },
    system: SYSTEM,
    messages,
  });
}

export function collectCitations(message: Anthropic.Beta.BetaMessage): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const block of message.content) {
    if (block.type !== "text" || !block.citations) continue;
    for (const c of block.citations) {
      // Tylko cytaty z naszych dokumentów (nie z wyszukiwarki) mają tytuł dokumentu
      if (!("document_title" in c)) continue;
      const title = c.document_title ?? "Źródło";
      const key = `${title}:${c.cited_text.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ document: title, text: c.cited_text.trim().slice(0, 400) });
    }
  }
  return out.slice(0, 6);
}

/** Tryb bez klucza API: proste dopasowanie słów kluczowych do bazy wiedzy (oznaczone w UI). */
export function offlineAnswer(question: string): { text: string; citations: Citation[] } {
  const words = question
    .toLowerCase()
    .split(/[^a-ząćęłńóśźż0-9,]+/)
    .filter((w) => w.length > 3);
  const lines = KNOWLEDGE.split("\n").filter((l) => l.startsWith("- "));
  const scored = lines
    .map((l) => ({ l, score: words.reduce((s, w) => s + (l.toLowerCase().includes(w.slice(0, Math.max(4, w.length - 2))) ? 1 : 0), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  if (!scored.length) {
    return {
      text: "Nie znalazłem odpowiedzi w bazie wiedzy. Sprawdź kalkulator lub zapytaj doradcę ZUS przez eZUS.",
      citations: [],
    };
  }
  return {
    text: "Oto, co mówią przepisy w tej sprawie:\n" + scored.map((x) => x.l).join("\n"),
    citations: scored.map((x) => ({ document: "Baza wiedzy Rodzicownika", text: x.l.slice(2) })),
  };
}

const PLAIN_SYSTEM = `Przepisujesz urzędowe teksty ZUS na prosty język (standard „prostej polszczyzny”).
Zasady: krótkie zdania, forma „Ty”, bez żargonu i skrótów (a jeśli są konieczne — wyjaśnij je w nawiasie), najważniejsza informacja na początku, potem co trzeba zrobić i do kiedy.
Nie zmieniaj faktów, kwot, dat ani podstaw prawnych. Nie dodawaj informacji, których nie ma w tekście. Zwróć wyłącznie przepisany tekst.`;

export async function toPlainLanguage(text: string): Promise<string> {
  if (aiProvider() === "openai") return plainLanguageOpenAI(PLAIN_SYSTEM, text);
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: "low" },
    system: PLAIN_SYSTEM,
    messages: [{ role: "user", content: text }],
  });
  if (response.stop_reason === "refusal") throw new Error("Nie udało się przepisać tekstu.");
  return response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
}

/** Asystent przez OpenAI — ten sam prompt, korpus i kontekst planu co przy Claude. */
export function streamAnswerViaOpenAI(history: ChatTurn[], plan: CalculationResult | null, onText: (d: string) => void) {
  return streamAnswerOpenAI(SYSTEM, loadCorpus(), history, planContext(plan), onText);
}
