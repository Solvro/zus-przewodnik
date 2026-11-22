import type { CalculationResult, Parent } from "./types";

export interface Expected {
  outcome: "granted" | "denied" | "unknown" | string;
  monthlyAmount: number | null;
  reason?: string | null;
}

export interface Comparison {
  rightMatches: boolean | null;
  amountMatches: boolean | null;
  computedOutcome: "granted" | "denied";
  computedAmount: number | null;
  diff: number | null;
}

/**
 * Porównanie wyniku silnika z rozstrzygnięciem ZUS z dokumentów sprawy.
 * „Zagrożone” (np. zaległość JDG) liczy się jako brak wypłaty — tak jak w decyzji.
 */
export function compareWithDecision(r: CalculationResult, expected: Expected | null, who: Parent): Comparison {
  const elig = r.eligibility.find((e) => e.benefit === "maternity_any" && e.parent === who);
  const firstPaid = r.segments.find((s) => s.parent === who && s.kind !== "sick_pay");
  const computedOutcome = elig?.status === "eligible" && firstPaid ? "granted" : "denied";
  const computedAmount = computedOutcome === "granted" ? (firstPaid?.monthlyAmount ?? null) : null;
  if (!expected || expected.outcome === "unknown") {
    return { rightMatches: null, amountMatches: null, computedOutcome, computedAmount, diff: null };
  }
  const rightMatches = expected.outcome === computedOutcome;
  let amountMatches: boolean | null = null;
  let diff: number | null = null;
  if (expected.monthlyAmount !== null && computedAmount !== null) {
    diff = Math.round((computedAmount - expected.monthlyAmount) * 100) / 100;
    amountMatches = Math.abs(diff) <= 1; // tolerancja 1 zł na zaokrąglenia
  }
  return { rightMatches, amountMatches, computedOutcome, computedAmount, diff };
}
