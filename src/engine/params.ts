/**
 * Parametry prawne silnika — wersjonowane datą obowiązywania.
 * Źródła: Załącznik HackNation 2026 (tabele wymiarów/stawek/podstawy),
 * ustawa zasiłkowa (Dz.U. 2026 poz. 854), Kodeks pracy (Dz.U. 2026 poz. 1245),
 * Poradnik dla rodziców ZUS 2026.
 *
 * W produkcji zestawy parametrów trzyma baza (panel admina), a silnik dostaje
 * zestaw obowiązujący na datę zdarzenia — patrz `selectParams`.
 */

export interface LegalParams {
  id: string;
  validFrom: string; // ISO yyyy-MM-dd
  validTo: string | null;
  label: string;

  // Kwoty bazowe
  minWage: number; // minimalne wynagrodzenie brutto
  socialContribRate: number; // składki społeczne finansowane przez ubezpieczonego (13,71%)
  forecastAvgWage: number; // prognozowane przeciętne wynagrodzenie (podstawa JDG)
  jdgStandardMinBaseRatio: number; // 60% prognozowanego przeciętnego wynagrodzenia
  jdgPreferentialBaseRatio: number; // 30% minimalnego wynagrodzenia
  voluntarySicknessMaxBase: number; // maks. miesięczna podstawa dobrowolnej składki chorobowej
  parentalBenefitFloor: number; // świadczenie rodzicielskie — minimalna kwota zasiłku macierzyńskiego (art. 31 ust. 3a)
  funeralAllowance: number; // zasiłek pogrzebowy (informacyjnie)

  // Stawki
  rates: {
    maternity: number; // 100% macierzyński / na warunkach / uzupełniający / ojcowski
    parental: number; // 70% rodzicielski
    averaged: number; // 81,5% wariant uśredniony
    sicknessPregnancy: number; // 100% chorobowy w ciąży (kod B)
    sicknessStandard: number; // 80% (informacyjnie)
    rehabPregnancy: number; // 100% świadczenie rehabilitacyjne w ciąży
  };

  // Wymiary (tygodnie)
  maternityWeeksByChildren: [number, number, number, number, number]; // 1,2,3,4,5+
  motherExclusiveWeeksAfterBirth: number; // 14
  motherMinWeeksForSpecialTransfer: number; // 8 (szpital/porzucenie)
  prenatalMaxWeeks: number; // 6
  parentalWeeks: {
    single: number;
    multiple: number;
    zaZyciemSingle: number;
    zaZyciemMultiple: number;
    adoptionShort: number; // 38 — gdy urlop na warunkach skrócony do 9 tyg. (art. 183 § 4 pkt 3, § 4²)
    adoptionShortZaZyciem: number; // 62
  };
  parentalExclusiveWeeks: number; // 9 nieprzenoszalnych
  parentalMaxParts: number; // 5
  parentalPartTimeMaxWeeks: {
    single: number;
    multiple: number;
    zaZyciemSingle: number;
    zaZyciemMultiple: number;
  };
  partTimeMaxFraction: number; // 0,5 etatu
  paternityWeeks: number; // 2
  paternityChildAgeMonths: number; // 12
  paternityMinPartWeeks: number; // 1
  adoptionMinWeeks: number; // 9 tygodni na warunkach urlopu macierzyńskiego
  adoptionChildAgeLimit: number; // 14
  fosterChildAgeLimit: number; // 7
  fosterChildAgeLimitDeferred: number; // 10
  lossMaternityWeeks: number; // 8
  lossMinDaysAfterDeath: number; // 7
  lossEarlyDeathWeeks: number; // 8 tygodni życia
  supplementaryCapLong: number; // 15
  supplementaryCapShort: number; // 8

  // Chorobowy
  sicknessPeriodDaysPregnancy: number; // 270
  sicknessPeriodDaysStandard: number; // 182
  employerSickPayDays: number; // 33
  employerSickPayDaysOver50: number; // 14
  waitingDaysMandatory: number; // 30
  waitingDaysVoluntary: number; // 90
  insuranceGapCreditDays: number; // 30 — przerwa nie przerywa ciągłości (art. 4 ust. 2)
  rehabMaxMonths: number; // 12

  // Procedury / terminy (dni)
  largePayerThreshold: number; // >20 ubezpieczonych → płatnik wypłaca
  debtThresholdRatio: number; // 1% minimalnego wynagrodzenia
  averagedRequestDays: number; // 21 dni po porodzie / przyjęciu
  parentalRequestDaysBefore: number; // 21
  supplementaryRequestDaysBefore: number; // 21
  partTimeRequestDaysBefore: number; // 21
  paternityRequestDaysBefore: number; // 7
  prenatalRequestDaysBefore: number; // 14
  returnToWorkNoticeDays: number; // 7
  adoptionRequestDaysAfter: number; // 7
  adoptionLeaveStartMaxDaysAfter: number; // 21
  zusPaymentMaxDays: number; // 30
  sicknessClaimMonths: number; // 6

  // Szacunek netto (zaliczka PIT)
  pitRate: number;
  pitMonthlyReduction: number;
}

export const PARAMS_2026: LegalParams = {
  id: "pl-2026-10-24",
  validFrom: "2026-01-01",
  validTo: null,
  label: "Stan prawny 2026 (po zmianach formularzy z 24.10.2026)",

  minWage: 4806,
  socialContribRate: 0.1371,
  forecastAvgWage: 9420,
  jdgStandardMinBaseRatio: 0.6,
  jdgPreferentialBaseRatio: 0.3,
  voluntarySicknessMaxBase: 23550,
  parentalBenefitFloor: 1000,
  funeralAllowance: 7000,

  rates: {
    maternity: 1,
    parental: 0.7,
    averaged: 0.815,
    sicknessPregnancy: 1,
    sicknessStandard: 0.8,
    rehabPregnancy: 1,
  },

  maternityWeeksByChildren: [20, 31, 33, 35, 37],
  motherExclusiveWeeksAfterBirth: 14,
  motherMinWeeksForSpecialTransfer: 8,
  prenatalMaxWeeks: 6,
  parentalWeeks: {
    single: 41,
    multiple: 43,
    zaZyciemSingle: 65,
    zaZyciemMultiple: 67,
    adoptionShort: 38,
    adoptionShortZaZyciem: 62,
  },
  parentalExclusiveWeeks: 9,
  parentalMaxParts: 5,
  parentalPartTimeMaxWeeks: {
    single: 82,
    multiple: 86,
    zaZyciemSingle: 130,
    zaZyciemMultiple: 134,
  },
  partTimeMaxFraction: 0.5,
  paternityWeeks: 2,
  paternityChildAgeMonths: 12,
  paternityMinPartWeeks: 1,
  adoptionMinWeeks: 9,
  adoptionChildAgeLimit: 14,
  fosterChildAgeLimit: 7,
  fosterChildAgeLimitDeferred: 10,
  lossMaternityWeeks: 8,
  lossMinDaysAfterDeath: 7,
  lossEarlyDeathWeeks: 8,
  supplementaryCapLong: 15,
  supplementaryCapShort: 8,

  sicknessPeriodDaysPregnancy: 270,
  sicknessPeriodDaysStandard: 182,
  employerSickPayDays: 33,
  employerSickPayDaysOver50: 14,
  waitingDaysMandatory: 30,
  waitingDaysVoluntary: 90,
  insuranceGapCreditDays: 30,
  rehabMaxMonths: 12,

  largePayerThreshold: 20,
  debtThresholdRatio: 0.01,
  averagedRequestDays: 21,
  parentalRequestDaysBefore: 21,
  supplementaryRequestDaysBefore: 21,
  partTimeRequestDaysBefore: 21,
  paternityRequestDaysBefore: 7,
  prenatalRequestDaysBefore: 14,
  returnToWorkNoticeDays: 7,
  adoptionRequestDaysAfter: 7,
  adoptionLeaveStartMaxDaysAfter: 21,
  zusPaymentMaxDays: 30,
  sicknessClaimMonths: 6,

  pitRate: 0.12,
  pitMonthlyReduction: 300,
};

export const DEFAULT_PARAM_SETS: LegalParams[] = [PARAMS_2026];

/** Wybiera zestaw parametrów obowiązujący w danym dniu. */
export function selectParams(date: string, sets: LegalParams[] = DEFAULT_PARAM_SETS): LegalParams {
  const match = sets
    .filter((p) => p.validFrom <= date && (p.validTo === null || p.validTo >= date))
    .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))[0];
  return match ?? sets[sets.length - 1];
}

/** Pochodne kwoty używane w wielu regułach. */
export function derived(p: LegalParams) {
  const net = (x: number) => round2(x * (1 - p.socialContribRate));
  return {
    minBasisFullTime: net(p.minWage), // 4 147,10 zł w 2026
    voluntaryMaxBasis: net(p.voluntarySicknessMaxBase), // 20 321,30 zł w 2026
    jdgStandardMinBase: round2(p.forecastAvgWage * p.jdgStandardMinBaseRatio), // 5 652,00 zł
    jdgPreferentialMinBase: round2(p.minWage * p.jdgPreferentialBaseRatio), // 1 441,80 zł
    debtThreshold: round2(p.minWage * p.debtThresholdRatio), // 48,06 zł
    net,
  };
}

/** Zaokrąglenie do groszy „połówka w górę”, odporne na błędy reprezentacji (20321,295 → 20321,30). */
export function round2(x: number): number {
  if (!Number.isFinite(x)) return 0;
  const sign = x < 0 ? -1 : 1;
  return sign * Number(`${Math.round(Number(`${Math.abs(x)}e2`))}e-2`);
}
