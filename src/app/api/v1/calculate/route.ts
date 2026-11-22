import { NextResponse } from "next/server";
import { calculate, Scenario } from "@/engine";
import { fromZod, problem, readJson } from "@/server/http";
import { getParamSets } from "@/server/param-store";

/**
 * POST /api/v1/calculate — scenariusz rodzica → uprawnienia, oś czasu, kwoty, ryzyka, dokumenty, terminy.
 * Silnik jest deterministyczny i czysty; ten sam kod działa w przeglądarce (natychmiastowe przeliczenia).
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === undefined) return problem(400, "Brak treści JSON", "Wyślij scenariusz w formacie JSON.");
  const parsed = Scenario.safeParse(body);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    // Parametry z panelu admina (wersjonowane datą obowiązywania)
    return NextResponse.json(calculate(parsed.data, { paramSets: getParamSets() }));
  } catch (e) {
    return problem(422, "Nie udało się policzyć scenariusza", e instanceof Error ? e.message : undefined);
  }
}
