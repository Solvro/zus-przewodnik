import { NextResponse } from "next/server";
import { calculate } from "@/engine";
import { extractCase } from "@/ai/extract";
import { caseToScenario, type ExtractedCase } from "@/ai/case-mapping";
import { aiConfigured, friendlyAiError } from "@/ai/client";
import { findSample } from "@/mocks/sample-cases";
import { listPrivateCases, readPrivateCaseFiles } from "@/server/private-cases";
import { problem } from "@/server/http";

export const maxDuration = 120;

/** POST /api/v1/cases/{id} — uruchomienie sprawy: dane z dokumentów → scenariusz → wynik silnika + rozstrzygnięcie do porównania. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const today = new Date().toISOString().slice(0, 10);
  let extracted: ExtractedCase;
  let expected: { outcome: string; monthlyAmount: number | null; reason?: string | null } | null = null;
  let ai = false;

  const sample = findSample(id);
  if (sample) {
    extracted = sample.extracted;
    expected = sample.extracted.zusDecision;
  } else {
    const priv = listPrivateCases().find((c) => c.id === id);
    if (!priv) return problem(404, "Nie znaleziono sprawy.");
    if (!aiConfigured()) return problem(503, "Odczyt dokumentów tej sprawy wymaga skonfigurowanego AI.");
    try {
      extracted = await extractCase(readPrivateCaseFiles(priv));
      ai = true;
    } catch (e) {
      const f = friendlyAiError(e);
      return problem(f.status, f.title);
    }
    expected = priv.expected ?? (extracted.zusDecision.outcome !== "unknown" ? extracted.zusDecision : null);
  }

  const { scenario, assumptions } = caseToScenario(extracted, today);
  let result = null;
  try {
    result = calculate(scenario);
  } catch {
    assumptions.push("Nie udało się policzyć wyniku z odczytanych danych — uzupełnij je w kalkulatorze.");
  }
  return NextResponse.json({ extracted, scenario, assumptions, result, expected, ai });
}
