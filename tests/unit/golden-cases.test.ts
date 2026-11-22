import { describe, expect, it } from "vitest";
import { calculate } from "@/engine";
import { compareWithDecision } from "@/engine/compare";
import { caseToScenario } from "@/ai/case-mapping";
import { SAMPLE_CASES } from "@/mocks/sample-cases";

/**
 * Testy „golden”: dla każdej sprawy wynik silnika musi zgadzać się z rozstrzygnięciem
 * (prawo do zasiłku i kwota miesięczna ±1 zł). Prawdziwe zestawy ZUS dochodzą tu po pozyskaniu.
 */
describe("przykładowe sprawy — zgodność z rozstrzygnięciem", () => {
  it.each(SAMPLE_CASES.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    const { scenario } = caseToScenario(c.extracted, "2026-11-21");
    const r = calculate(scenario);
    const who = c.extracted.insured.role === "father" ? "father" : "mother";
    const cmp = compareWithDecision(r, c.extracted.zusDecision, who);
    expect(cmp.rightMatches, `prawo: oczekiwano ${c.extracted.zusDecision.outcome}, wyszło ${cmp.computedOutcome}`).toBe(true);
    if (c.extracted.zusDecision.monthlyAmount !== null) {
      expect(cmp.amountMatches, `kwota: oczekiwano ${c.extracted.zusDecision.monthlyAmount}, wyszło ${cmp.computedAmount}`).toBe(true);
    }
  });
});
