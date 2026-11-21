import { derived, round2, type LegalParams } from "./params";
import type { BasisInput, BasisResult, InsuranceTitle, TraceStep } from "./types";

const zl = (x: number) =>
  `${x.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;

const LEGAL_EMPLOYEE = [
  { act: "ustawa zasiłkowa" as const, ref: "art. 36" },
  { act: "ustawa zasiłkowa" as const, ref: "art. 45" },
  { act: "ustawa zasiłkowa" as const, ref: "art. 47" },
];
const LEGAL_NON_EMPLOYEE = [
  { act: "ustawa zasiłkowa" as const, ref: "art. 48" },
  { act: "ustawa zasiłkowa" as const, ref: "art. 48a" },
  { act: "ustawa zasiłkowa" as const, ref: "art. 49" },
];

/**
 * Ustala miesięczną podstawę wymiaru zasiłku (po odliczeniu 13,71% składek).
 * Dla pracownika: średnia z miesięcy (pomijając te z < ½ czasu pracy) + 1/12 premii kwartalnych i rocznych,
 * nie mniej niż minimalne wynagrodzenie netto składek przy pełnym etacie.
 * Dla niepracownika: średnia podstaw składek chorobowych; przy krótszym ubezpieczeniu — art. 48a / 49.
 */
export function computeBasis(
  input: BasisInput,
  ctx: { title: InsuranceTitle; fullTime: boolean },
  p: LegalParams,
): BasisResult {
  const d = derived(p);
  const steps: TraceStep[] = [];
  const isEmployee = ctx.title === "employment";
  let basis = 0;
  let method = "";

  switch (input.mode) {
    case "direct": {
      basis = round2(input.monthlyBasis);
      method = "Podstawa podana wprost (np. z zaświadczenia płatnika Z-3/Z-3a lub decyzji)";
      steps.push({
        id: "basis.direct",
        label: "Podstawa wymiaru (podana)",
        value: zl(basis),
        source: "dane",
      });
      break;
    }
    case "gross": {
      basis = d.net(input.monthlyGross);
      method = "Szacunek z miesięcznego wynagrodzenia brutto";
      steps.push({
        id: "basis.gross",
        label: "Wynagrodzenie brutto pomniejszone o składki 13,71%",
        value: zl(basis),
        formula: `${zl(input.monthlyGross)} × (1 − ${p.socialContribRate})`,
        legal: isEmployee ? LEGAL_EMPLOYEE : LEGAL_NON_EMPLOYEE,
        source: "reguła",
      });
      break;
    }
    case "months": {
      const included = input.months.filter((m) => m.workedAtLeastHalf);
      const excluded = input.months.length - included.length;
      const avg = included.length ? included.reduce((s, m) => s + m.gross, 0) / included.length : 0;
      const quarterly = input.quarterlyBonusesLast4.reduce((s, x) => s + x, 0) / 12;
      const annual = input.annualBonusLastYear / 12;
      const grossTotal = avg + quarterly + annual;
      basis = d.net(grossTotal);
      method = `Średnia z ${included.length} pełnych miesięcy${excluded ? ` (pominięto ${excluded} z < ½ czasu pracy)` : ""}`;
      steps.push({
        id: "basis.avg",
        label: "Przeciętne miesięczne wynagrodzenie",
        value: zl(round2(avg)),
        formula: `suma z ${included.length} mies. ÷ ${included.length}`,
        legal: [{ act: "ustawa zasiłkowa", ref: "art. 36 ust. 1–2, art. 37" }],
        source: "reguła",
      });
      if (excluded) {
        steps.push({
          id: "basis.excluded",
          label: "Pominięte miesiące (przepracowano mniej niż połowę czasu pracy)",
          value: String(excluded),
          legal: [{ act: "ustawa zasiłkowa", ref: "art. 38 ust. 1" }],
          source: "reguła",
        });
      }
      if (quarterly) {
        steps.push({
          id: "basis.quarterly",
          label: "Premie kwartalne: 1/12 kwot z 4 kwartałów",
          value: zl(round2(quarterly)),
          legal: [{ act: "ustawa zasiłkowa", ref: "art. 42" }],
          source: "reguła",
        });
      }
      if (annual) {
        steps.push({
          id: "basis.annual",
          label: "Premia roczna: 1/12 kwoty za poprzedni rok",
          value: zl(round2(annual)),
          legal: [{ act: "ustawa zasiłkowa", ref: "art. 42" }],
          source: "reguła",
        });
      }
      steps.push({
        id: "basis.net",
        label: "Po odliczeniu składek społecznych 13,71%",
        value: zl(basis),
        formula: `${zl(round2(grossTotal))} × (1 − ${p.socialContribRate})`,
        legal: [{ act: "ustawa zasiłkowa", ref: "art. 3 pkt 4" }],
        source: "reguła",
      });
      break;
    }
    case "declared": {
      const months = input.monthlyBases.length;
      if (months >= 12) {
        const avg = input.monthlyBases.slice(-12).reduce((s, x) => s + x, 0) / 12;
        basis = d.net(avg);
        method = "Średnia podstaw składek chorobowych z 12 miesięcy";
        steps.push({
          id: "basis.declared12",
          label: "Średnia podstaw składek z 12 miesięcy, po odliczeniu 13,71%",
          value: zl(basis),
          formula: `${zl(round2(avg))} × (1 − ${p.socialContribRate})`,
          legal: [{ act: "ustawa zasiłkowa", ref: "art. 48 ust. 1" }],
          source: "reguła",
        });
      } else if (months === 0) {
        // art. 49 — prawo powstało przed upływem pełnego miesiąca ubezpieczenia
        if (ctx.title === "business" && input.minBaseType !== "none") {
          const minBase = input.minBaseType === "preferential" ? d.jdgPreferentialMinBase : d.jdgStandardMinBase;
          basis = d.net(minBase);
          method = "Najniższa podstawa składek za miesiąc powstania prawa (brak pełnego miesiąca ubezpieczenia)";
        } else {
          basis = d.net(input.contractMonthlyAmount ?? 0);
          method = "Kwota z umowy za miesiąc powstania prawa (brak pełnego miesiąca ubezpieczenia)";
        }
        steps.push({
          id: "basis.firstMonth",
          label: method,
          value: zl(basis),
          legal: [{ act: "ustawa zasiłkowa", ref: "art. 49 ust. 1" }],
          source: "reguła",
        });
      } else if (ctx.title === "business" && input.minBaseType !== "none") {
        // art. 48a — zadeklarowana podstawa, ubezpieczenie krótsze niż 12 miesięcy
        const minBase = input.minBaseType === "preferential" ? d.jdgPreferentialMinBase : d.jdgStandardMinBase;
        const minNet = d.net(minBase);
        const avgDeclared = input.monthlyBases.reduce((s, x) => s + x, 0) / months;
        const excessNet = Math.max(0, d.net(avgDeclared) - minNet);
        const part2 = round2((excessNet / 12) * months);
        basis = round2(minNet + part2);
        method = `Art. 48a: najniższa podstawa + 1/12 nadwyżki × ${months} mies.`;
        steps.push({
          id: "basis.48a.min",
          label: "Najniższa podstawa składek po odliczeniu 13,71%",
          value: zl(minNet),
          legal: [{ act: "ustawa zasiłkowa", ref: "art. 48a ust. 1 pkt 1" }],
          source: "parametr",
        });
        steps.push({
          id: "basis.48a.excess",
          label: `Nadwyżka ponad najniższą podstawę × ${months}/12`,
          value: zl(part2),
          formula: `${zl(round2(excessNet))} ÷ 12 × ${months}`,
          legal: [{ act: "ustawa zasiłkowa", ref: "art. 48a ust. 1 pkt 2" }],
          source: "reguła",
        });
      } else {
        const avg = input.monthlyBases.reduce((s, x) => s + x, 0) / months;
        basis = d.net(avg);
        method = `Średnia podstaw składek z ${months} pełnych miesięcy ubezpieczenia`;
        steps.push({
          id: "basis.declaredShort",
          label: method + ", po odliczeniu 13,71%",
          value: zl(basis),
          legal: [{ act: "ustawa zasiłkowa", ref: "art. 48 ust. 2 w zw. z art. 36 ust. 2" }],
          source: "reguła",
        });
      }
      break;
    }
  }

  let minimumApplied = false;
  let capApplied = false;

  if (isEmployee && ctx.fullTime && input.mode !== "direct" && basis < d.minBasisFullTime) {
    steps.push({
      id: "basis.minimum",
      label: "Podstawa podniesiona do minimum dla pełnego etatu",
      value: zl(d.minBasisFullTime),
      formula: `${zl(p.minWage)} × (1 − ${p.socialContribRate})`,
      legal: [{ act: "ustawa zasiłkowa", ref: "art. 45 ust. 1" }],
      source: "parametr",
    });
    basis = d.minBasisFullTime;
    minimumApplied = true;
  }

  if (!isEmployee && input.mode !== "direct" && basis > d.voluntaryMaxBasis) {
    steps.push({
      id: "basis.cap",
      label: "Podstawa ograniczona do limitu dobrowolnej składki chorobowej",
      value: zl(d.voluntaryMaxBasis),
      formula: `${zl(p.voluntarySicknessMaxBase)} × (1 − ${p.socialContribRate})`,
      legal: [{ act: "ustawa o sus", ref: "art. 20 ust. 3" }, { act: "Załącznik", ref: "Podstawa — niepracownicy" }],
      source: "parametr",
    });
    basis = d.voluntaryMaxBasis;
    capApplied = true;
  }

  return { monthlyBasis: round2(basis), method, minimumApplied, capApplied, steps };
}
