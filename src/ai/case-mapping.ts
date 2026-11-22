import { z } from "zod";
import type { Scenario } from "@/engine/types";

/**
 * Czysty moduł (bez I/O): schemat danych odczytanych z dokumentów sprawy
 * i deterministyczne mapowanie na scenariusz silnika. Używany przez API, testy i panel admina.
 */

/* ───────────── Schemat danych odczytanych z dokumentów sprawy ───────────── */

const isoOrNull = z.string().nullable().describe("Data RRRR-MM-DD albo null, jeśli brak w dokumentach");

export const ExtractedCase = z.object({
  documents: z
    .array(
      z.object({
        kind: z.enum(["Z-3", "Z-3a", "Z-3b", "ZAM", "ZUR", "ZAO", "ZAS-53", "ZAS-12", "poswiadczenie_ubezpieczenia", "zrzut_systemu_zus", "zaswiadczenie_lekarskie", "akt_urodzenia", "zaswiadczenie_szpitala", "inne"]),
        summary: z.string().describe("Jedno zdanie: co zawiera dokument"),
      }),
    )
    .describe("Rozpoznane dokumenty w kolejności przekazania"),
  insured: z.object({
    role: z.enum(["mother", "father", "unknown"]).describe("Czy wnioskodawca to matka, ojciec dziecka czy nie wiadomo"),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
  insuranceTitle: z.enum(["employment", "mandate", "business", "none", "unknown"]),
  sicknessInsurance: z.enum(["mandatory", "voluntary", "none", "unknown"]),
  insuranceFrom: isoOrNull,
  insuranceTo: isoOrNull,
  payerInsuredCount: z.number().nullable().describe("Liczba ubezpieczonych zgłaszanych przez płatnika, jeśli wynika z dokumentów"),
  fullTime: z.boolean().nullable(),
  monthlyIncomes: z
    .array(z.object({ month: z.string().describe("RRRR-MM"), gross: z.number(), workedAtLeastHalf: z.boolean() }))
    .describe("Wynagrodzenia/przychody z Z-3 / Z-3a za kolejne miesiące (składniki miesięczne, brutto)"),
  quarterlyBonuses: z.array(z.number()).describe("Premie kwartalne z ostatnich 4 kwartałów"),
  annualBonus: z.number().nullable(),
  declaredBases: z.array(z.number()).describe("Podstawy wymiaru składki chorobowej z kolejnych miesięcy (np. z poświadczenia ubezpieczenia, dla JDG/zlecenia)"),
  benefitBasis: z.number().nullable().describe("Podstawa wymiaru zasiłku podana wprost (np. w decyzji lub zrzucie systemu)"),
  childBirthDate: isoOrNull,
  dueDate: isoOrNull,
  placementDate: isoOrNull,
  adoptedChildBirthDate: isoOrNull,
  childrenCount: z.number().nullable(),
  requestedBenefit: z.enum(["maternity", "parental", "paternity", "sickness", "adoption", "supplementary", "unknown"]),
  requestedPeriods: z.array(z.object({ from: z.string(), to: z.string(), kind: z.string() })),
  averaged815: z.boolean().nullable().describe("Czy złożono wniosek o 81,5% (zasiłek za pełny okres)"),
  contributionDebt: z.number().nullable(),
  zusDecision: z.object({
    outcome: z.enum(["granted", "denied", "unknown"]).describe("Rozstrzygnięcie ZUS, jeśli dokumenty je zawierają"),
    monthlyAmount: z.number().nullable(),
    reason: z.string().nullable(),
  }),
  uncertainFields: z.array(z.string()).describe("Pola, których odczyt jest niepewny (nieczytelne, sprzeczne dane)"),
  notes: z.array(z.string()).describe("Krótkie uwagi istotne dla ustalenia prawa do zasiłku"),
});
export type ExtractedCase = z.infer<typeof ExtractedCase>;

/* ───────────── Mapowanie odczytu na scenariusz silnika (deterministyczne) ───────────── */

export function caseToScenario(ex: ExtractedCase, today: string): { scenario: Scenario; assumptions: string[] } {
  const assumptions: string[] = [];
  const title = ex.insuranceTitle === "unknown" ? "employment" : ex.insuranceTitle;
  if (ex.insuranceTitle === "unknown") assumptions.push("Nie rozpoznano tytułu ubezpieczenia — przyjęto umowę o pracę.");

  let basis: NonNullable<Scenario["mother"]["basis"]> | undefined;
  if (ex.benefitBasis) {
    basis = { mode: "direct", monthlyBasis: ex.benefitBasis };
  } else if (title === "employment" && ex.monthlyIncomes.length) {
    basis = {
      mode: "months",
      months: ex.monthlyIncomes.slice(-12).map((m) => ({ month: m.month.slice(0, 7), gross: m.gross, workedAtLeastHalf: m.workedAtLeastHalf })),
      quarterlyBonusesLast4: ex.quarterlyBonuses.slice(-4),
      annualBonusLastYear: ex.annualBonus ?? 0,
    };
  } else if (ex.declaredBases.length) {
    basis = { mode: "declared", monthlyBases: ex.declaredBases.slice(-12), minBaseType: title === "business" ? "standard" : "none" };
  } else if (ex.monthlyIncomes.length) {
    basis = { mode: "declared", monthlyBases: ex.monthlyIncomes.slice(-12).map((m) => m.gross), minBaseType: "none" };
  } else {
    assumptions.push("Brak danych o wynagrodzeniu — uzupełnij podstawę wymiaru, aby policzyć kwoty.");
  }

  const parent: Scenario["mother"] = {
    title,
    voluntarySickness: ex.sicknessInsurance === "voluntary" || (title !== "employment" && ex.sicknessInsurance !== "none"),
    insuranceStart: ex.insuranceFrom ?? undefined,
    insuranceEnd: ex.insuranceTo ?? null,
    payerInsuredCount: ex.payerInsuredCount ?? undefined,
    fullTime: ex.fullTime ?? true,
    basis,
    contributionDebt: ex.contributionDebt ?? 0,
    basisRaisedDuringPregnancy: false,
  };
  if (title !== "employment" && ex.sicknessInsurance === "unknown") assumptions.push("Nie wynika jasno, czy opłacano dobrowolne chorobowe — przyjęto, że tak.");
  if (ex.payerInsuredCount === null && title !== "business") assumptions.push("Nie wiadomo, ilu ubezpieczonych zgłasza płatnik — pokażemy obie drogi wypłaty.");

  const isAdoption = ex.requestedBenefit === "adoption" || !!ex.placementDate;
  const isFather = ex.insured.role === "father";
  const event: Scenario["event"] = isAdoption ? "adoption" : ex.requestedBenefit === "sickness" && !ex.childBirthDate ? "pregnancy" : "birth";

  const sickLeaves = ex.requestedBenefit === "sickness"
    ? ex.requestedPeriods.filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.from) && /^\d{4}-\d{2}-\d{2}$/.test(p.to)).map((p) => ({ from: p.from, to: p.to, pregnancyCodeB: true }))
    : [];

  const scenario: Scenario = {
    event,
    today,
    birthDate: event === "birth" ? (ex.childBirthDate ?? ex.dueDate ?? undefined) : undefined,
    dueDate: ex.dueDate ?? ex.childBirthDate ?? undefined,
    placementDate: isAdoption ? (ex.placementDate ?? undefined) : undefined,
    childBirthDate: isAdoption ? (ex.adoptedChildBirthDate ?? undefined) : undefined,
    childrenCount: Math.max(1, Math.round(ex.childrenCount ?? 1)),
    // Wnioskodawca-ojciec: liczymy jego uprawnienia jako drugiego rodzica; matka bez danych
    mother: isFather ? { title: "none", voluntarySickness: false, insuranceEnd: null, fullTime: true, contributionDebt: 0, basisRaisedDuringPregnancy: false } : parent,
    father: isFather ? parent : undefined,
    sickLeaves,
    plan: {
      averaged: !!ex.averaged815,
      prenatalWeeks: 0,
      parentalFatherWeeks: isFather && ex.requestedBenefit === "parental" ? 9 : 0,
      parentalConcurrent: false,
      paternity: ex.requestedBenefit === "paternity" || isFather,
      supplementaryBy: isFather ? "father" : "mother",
    },
  };
  if (isFather) assumptions.push("Wnioskodawcą jest ojciec — dane matki nieznane (przyjęto brak ubezpieczenia matki; zmień w kalkulatorze, jeśli jest ubezpieczona).");
  return { scenario, assumptions };
}
