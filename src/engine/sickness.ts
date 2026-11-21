import { addDays, diffDays, endOf, fmt, spanDays, yearOf } from "./dates";
import { waitingPeriod, sicknessInsuranceKind } from "./insurance";
import type { RawSegment } from "./leave";
import type { LegalParams } from "./params";
import type { Eligibility, ScenarioParsed, TraceStep } from "./types";

export interface SicknessResult {
  segments: RawSegment[];
  eligibility: Eligibility[];
  trace: TraceStep[];
  usedDays: number;
  exhausted: boolean;
}

/**
 * Zasiłek chorobowy w ciąży (kod B): 100% podstawy, okres zasiłkowy 270 dni.
 * Pracownica: pierwsze 33 dni w roku (14 dni po 50. r.ż.) — wynagrodzenie chorobowe od pracodawcy.
 * Niepracownica: zasiłek od 1. dnia (po okresie wyczekiwania).
 * Zwolnienia kończą się najpóźniej dzień przed rozpoczęciem macierzyńskiego.
 */
export function computeSickness(
  s: ScenarioParsed,
  maternityStart: string | null,
  p: LegalParams,
): SicknessResult {
  const out: SicknessResult = { segments: [], eligibility: [], trace: [], usedDays: 0, exhausted: false };
  const leaves = s.sickLeaves.filter((l) => l.pregnancyCodeB).sort((a, b) => (a.from < b.from ? -1 : 1));
  if (!leaves.length) return out;

  const mother = s.mother;
  const kind = sicknessInsuranceKind(mother);
  if (!kind) {
    out.eligibility.push({
      benefit: "sickness",
      parent: "mother",
      status: "not_eligible",
      title: "Zasiłek chorobowy w ciąży",
      reasons: ["Nie podlegasz ubezpieczeniu chorobowemu — zwolnienie lekarskie nie da prawa do zasiłku."],
      legal: [{ act: "ustawa zasiłkowa", ref: "art. 4, art. 6" }],
    });
    return out;
  }

  const isEmployee = mother.title === "employment";
  const employerDaysLimit = (mother.age ?? 30) >= 50 ? p.employerSickPayDaysOver50 : p.employerSickPayDays;
  const employerUsedByYear = new Map<number, number>();
  let used = 0;
  let id = 0;
  const reasons: string[] = [];

  for (const leave of leaves) {
    let from = leave.from;
    let to = leave.to;
    if (maternityStart && to >= maternityStart) to = addDays(maternityStart, -1);
    if (to < from) continue;

    const wp = waitingPeriod(mother, from, p);
    if (!wp.satisfied && wp.firstEligibleDay) {
      reasons.push(
        `Okres wyczekiwania: ${wp.required} dni ${kind === "mandatory" ? "obowiązkowego" : "dobrowolnego"} ubezpieczenia — zasiłek od ${fmt(wp.firstEligibleDay)}.`,
      );
      if (wp.firstEligibleDay > to) continue;
      from = wp.firstEligibleDay;
    }

    let days = spanDays(from, to);
    const remainingPeriod = p.sicknessPeriodDaysPregnancy - used;
    if (remainingPeriod <= 0) {
      out.exhausted = true;
      break;
    }
    if (days > remainingPeriod) {
      days = remainingPeriod;
      to = endOf(from, days);
      out.exhausted = true;
    }

    let cursor = from;
    if (isEmployee) {
      const year = yearOf(from);
      const usedEmployer = employerUsedByYear.get(year) ?? 0;
      const employerDays = Math.min(days, Math.max(0, employerDaysLimit - usedEmployer));
      if (employerDays > 0) {
        out.segments.push({
          id: `sick_pay-${++id}`,
          parent: "mother",
          kind: "sick_pay",
          label: "Wynagrodzenie chorobowe (płaci pracodawca)",
          start: cursor,
          days: employerDays,
          rate: p.rates.sicknessPregnancy,
          workFraction: 0,
          legal: [{ act: "Kodeks pracy", ref: "art. 92 § 1 pkt 1" }],
        });
        employerUsedByYear.set(year, usedEmployer + employerDays);
        cursor = addDays(cursor, employerDays);
      }
    }
    const zasDays = diffDays(cursor, to) + 1;
    if (zasDays > 0) {
      out.segments.push({
        id: `sickness-${++id}`,
        parent: "mother",
        kind: "sickness",
        label: "Zasiłek chorobowy w ciąży (100%)",
        start: cursor,
        days: zasDays,
        rate: p.rates.sicknessPregnancy,
        workFraction: 0,
        legal: [{ act: "ustawa zasiłkowa", ref: "art. 11 ust. 2 pkt 2, art. 8" }],
      });
    }
    used += days;
  }
  out.usedDays = used;

  out.eligibility.push({
    benefit: "sickness",
    parent: "mother",
    status: out.segments.length ? "eligible" : "not_eligible",
    title: "Zasiłek chorobowy w ciąży",
    reasons: [
      ...(out.segments.length
        ? [
            `Zwolnienie z kodem „B” — 100% podstawy wymiaru${isEmployee ? `; pierwsze ${employerDaysLimit} dni w roku płaci pracodawca jako wynagrodzenie chorobowe` : " od pierwszego dnia"}.`,
            `Wykorzystano ${used} z ${p.sicknessPeriodDaysPregnancy} dni okresu zasiłkowego.`,
          ]
        : []),
      ...reasons,
    ],
    legal: [
      { act: "ustawa zasiłkowa", ref: "art. 4 (okres wyczekiwania), art. 8 (270 dni), art. 11 ust. 2" },
    ],
  });

  if (out.exhausted) {
    out.eligibility.push({
      benefit: "rehab",
      parent: "mother",
      status: "info",
      title: "Świadczenie rehabilitacyjne",
      reasons: [
        `Wyczerpano ${p.sicknessPeriodDaysPregnancy} dni zasiłku. Jeśli dalsze leczenie rokuje odzyskanie zdolności do pracy, możesz wystąpić o świadczenie rehabilitacyjne — w ciąży 100% podstawy, do ${p.rehabMaxMonths} miesięcy (orzeka lekarz orzecznik ZUS).`,
      ],
      legal: [{ act: "ustawa zasiłkowa", ref: "art. 18, art. 19 ust. 1" }],
    });
  }

  out.trace.push({
    id: "sickness.period",
    label: "Okres zasiłkowy w ciąży",
    value: `${used} / ${p.sicknessPeriodDaysPregnancy} dni`,
    legal: [{ act: "ustawa zasiłkowa", ref: "art. 8, art. 9" }],
    source: "reguła",
  });
  return out;
}
