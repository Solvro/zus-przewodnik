import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type Anthropic from "@anthropic-ai/sdk";
import { FALLBACK, MODEL, aiProvider, getClient } from "./client";
import { extractCaseOpenAI } from "./openai";
import { ExtractedCase } from "./case-mapping";

export { ExtractedCase, caseToScenario } from "./case-mapping";

const SYSTEM = `Jesteś asystentem do wstępnego odczytu dokumentów spraw zasiłkowych ZUS (zasiłek chorobowy w ciąży, zasiłek macierzyński).
Twoje zadanie: odczytać dane z przekazanych dokumentów (formularze ZAM, ZUR, ZAO, Z-3, Z-3a, Z-3b, ZAS-53, ZAS-12, poświadczenia ubezpieczenia, zrzuty z systemu ZUS, zaświadczenia) i zwrócić je w podanym schemacie.

Zasady:
- Przepisuj tylko to, co jest w dokumentach. Niczego nie zgaduj ani nie wyliczaj — jeśli wartości nie ma, zwróć null lub pustą tablicę.
- Daty zapisuj jako RRRR-MM-DD, miesiące jako RRRR-MM, kwoty jako liczby w złotych (kropka dziesiętna).
- W Z-3 / Z-3a wynagrodzenie z miesięcy, w których przepracowano mniej niż połowę czasu pracy, oznacz workedAtLeastHalf=false.
- Formularze ZUR i ZAO zostały od 24.10.2026 zastąpione przez ZAM, a Z-3b zlikwidowany — nadal je rozpoznawaj w starszych sprawach.
- Każdą wątpliwość (nieczytelny fragment, sprzeczne daty) wpisz do uncertainFields.
- Nie oceniasz prawa do zasiłku — robi to osobny, deterministyczny silnik reguł.`;

export type UploadedDoc = { name: string; mediaType: string; base64: string };

/** Odczyt dokumentów sprawy przez Claude (structured outputs) → dane do zatwierdzenia przez użytkownika. */
export async function extractCase(docs: UploadedDoc[]): Promise<ExtractedCase> {
  if (aiProvider() === "openai") return extractCaseOpenAI(SYSTEM, docs);
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const d of docs) {
    if (d.mediaType === "application/pdf") {
      content.push({ type: "document", title: d.name, source: { type: "base64", media_type: "application/pdf", data: d.base64 } });
    } else {
      content.push({
        type: "image",
        source: { type: "base64", media_type: d.mediaType as "image/png" | "image/jpeg" | "image/webp", data: d.base64 },
      });
    }
  }
  content.push({ type: "text", text: `Odczytaj dane z ${docs.length} dokument(ów) sprawy (${docs.map((d) => d.name).join(", ")}).` });

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "high", format: betaZodOutputFormat(ExtractedCase) },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new Error("Model odmówił przetworzenia dokumentów.");
  if (!response.parsed_output) throw new Error("Nie udało się odczytać danych w oczekiwanym formacie.");
  return response.parsed_output;
}
