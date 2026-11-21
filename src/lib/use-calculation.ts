"use client";

import { useMemo } from "react";
import { Scenario as ScenarioSchema, type CalculationResult, type Scenario } from "@/engine/types";
import { useCalculateQuery } from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";
import { useDebounced } from "@/lib/use-debounced";

export type CalcOutcome =
  | { ok: true; result: CalculationResult }
  | { ok: false; issues: string[]; pending?: boolean };

const FIELD_NAMES: Record<string, string> = {
  birthDate: "data porodu",
  dueDate: "przewidywana data porodu",
  placementDate: "data przyjęcia dziecka",
  childBirthDate: "data urodzenia dziecka",
  insuranceStart: "początek ubezpieczenia",
  insuranceEnd: "koniec umowy",
  monthlyGross: "wynagrodzenie",
  monthlyBasis: "podstawa wymiaru",
  from: "początek zwolnienia",
  to: "koniec zwolnienia",
};

/** Walidacja po stronie klienta — ten sam schemat Zod co w API, więc błędy są identyczne. */
export function validateScenario(s: Scenario): { ok: true } | { ok: false; issues: string[] } {
  const parsed = ScenarioSchema.safeParse(s);
  if (parsed.success) return { ok: true };
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => {
      const field = String(i.path.at(-1) ?? "");
      return `${FIELD_NAMES[field] ?? field}: ${i.message}`;
    }),
  };
}

/**
 * Obliczenie przez REST API (TanStack Query): debounce 250 ms, cache wyników per scenariusz,
 * poprzedni wynik widoczny w trakcie przeliczania (placeholderData: keepPreviousData).
 */
export function useCalculation(s: Scenario) {
  const debounced = useDebounced(s, 250);
  const validation = useMemo(() => validateScenario(debounced), [debounced]);
  const query = useCalculateQuery(debounced, validation.ok);

  const outcome: CalcOutcome = !validation.ok
    ? validation
    : query.data
      ? { ok: true, result: query.data }
      : query.error
        ? {
            ok: false,
            issues:
              query.error instanceof ApiError && query.error.issues.length
                ? query.error.issues.map((i) => `${FIELD_NAMES[i.path.split(".").at(-1) ?? ""] ?? i.path}: ${i.message}`)
                : [query.error.message || "Nie udało się połączyć z serwerem. Spróbuj ponownie."],
          }
        : { ok: false, issues: [], pending: true };

  const stale = debounced !== s || query.isPlaceholderData || query.isFetching;
  return { outcome, stale, refetch: query.refetch, isError: query.isError };
}

/** Warianty do porównania obok siebie (81,5% vs 100/70, podział z drugim rodzicem). */
export function buildVariants(s: Scenario): { id: string; label: string; scenario: Scenario }[] {
  const plan = s.plan ?? {};
  const out: { id: string; label: string; scenario: Scenario }[] = [
    { id: "classic", label: "100% + 70%", scenario: { ...s, plan: { ...plan, averaged: false } } },
    { id: "averaged", label: "81,5% przez cały okres", scenario: { ...s, plan: { ...plan, averaged: true } } },
  ];
  if (s.father && s.father.title !== "none" && s.event !== "pregnancy") {
    out.push({
      id: "split9",
      label: "81,5% + 9 tyg. drugiego rodzica",
      scenario: { ...s, plan: { ...plan, averaged: true, parentalFatherWeeks: Math.max(9, plan.parentalFatherWeeks ?? 0), parentalMotherWeeks: undefined } },
    });
  }
  return out;
}
