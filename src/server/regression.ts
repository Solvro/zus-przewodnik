import "server-only";
import { calculate, type LegalParams } from "@/engine";
import { compareWithDecision } from "@/engine/compare";
import { caseToScenario } from "@/ai/case-mapping";
import { SAMPLE_CASES } from "@/mocks/sample-cases";

/** Regresja: przeliczenie wszystkich spraw z rozstrzygnięciem dla danego zestawu parametrów. */
export function runRegression(params?: LegalParams) {
  return SAMPLE_CASES.map((c) => {
    const { scenario } = caseToScenario(c.extracted, "2026-11-21");
    const r = calculate(scenario, params ? { params } : undefined);
    const who = c.extracted.insured.role === "father" ? "father" : "mother";
    const cmp = compareWithDecision(r, c.extracted.zusDecision, who);
    return {
      id: c.id,
      title: c.title,
      expected: c.extracted.zusDecision,
      computedOutcome: cmp.computedOutcome,
      computedAmount: cmp.computedAmount,
      pass: cmp.rightMatches !== false && cmp.amountMatches !== false,
      diff: cmp.diff,
    };
  });
}
