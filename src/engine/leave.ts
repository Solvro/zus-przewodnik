import { addDays, addMonths, addYears, ageInYears, diffDays, endOf, endOfYear, fmt, maxDate, spanDays, yearOf } from "./dates";
import type { LegalParams } from "./params";
import { coverageOn } from "./insurance";
import type { BenefitKind, LegalRef, Parent, ScenarioParsed, TraceStep } from "./types";

/** Segment bez kwot — kwoty dolicza moduł `payments`. */
export interface RawSegment {
  id: string;
  parent: Parent;
  kind: BenefitKind;
  label: string;
  start: string;
  days: number;
  rate: number;
  workFraction: number;
  legal: LegalRef[];
}

export interface TimelineContext {
  motherCovered: boolean;
  fatherCovered: boolean;
  fatherIsEmployee: boolean;
  motherIsEmployee: boolean;
}

export interface TimelineResult {
  segments: RawSegment[];
  eventDate: string | null;
  weeks: {
    maternity: number;
    parentalPool: number;
    parentalUsedMother: number;
    parentalUsedFather: number;
    parentalUnused: number;
    supplementary: number;
    paternity: number;
  };
  averagedEffective: boolean;
  /** Ostatni dzień, do którego można wykorzystać urlop rodzicielski. */
  parentalDeadline: string | null;
  paternityDeadline: string | null;
  adoptionShort: boolean;
  notEligibleReason: string | null;
  validation: string[];
  trace: TraceStep[];
}

const KP = (ref: string): LegalRef => ({ act: "Kodeks pracy", ref });
const UZ = (ref: string): LegalRef => ({ act: "ustawa zasiłkowa", ref });

export function maternityWeeks(children: number, p: LegalParams): number {
  return p.maternityWeeksByChildren[Math.min(Math.max(children, 1), 5) - 1];
}

export function parentalPool(children: number, zaZyciem: boolean, p: LegalParams): number {
  const multiple = children > 1;
  if (zaZyciem) return multiple ? p.parentalWeeks.zaZyciemMultiple : p.parentalWeeks.zaZyciemSingle;
  return multiple ? p.parentalWeeks.multiple : p.parentalWeeks.single;
}

export function partTimeCap(children: number, zaZyciem: boolean, p: LegalParams): number {
  const multiple = children > 1;
  if (zaZyciem) return multiple ? p.parentalPartTimeMaxWeeks.zaZyciemMultiple : p.parentalPartTimeMaxWeeks.zaZyciemSingle;
  return multiple ? p.parentalPartTimeMaxWeeks.multiple : p.parentalPartTimeMaxWeeks.single;
}

/** Wymiar uzupełniającego urlopu macierzyńskiego (KP art. 180² — tydzień za każdy tydzień hospitalizacji). */
export function supplementaryWeeks(
  prem: NonNullable<ScenarioParsed["premature"]>,
  p: LegalParams,
): { weeks: number; cap: number; rule: string } {
  const { gestationWeek: gw, birthWeightG: w, hospitalDays, hospitalStartDay } = prem;
  if (gw < 28 || w <= 1000) {
    return {
      weeks: Math.min(Math.ceil(hospitalDays / 7), p.supplementaryCapLong),
      cap: p.supplementaryCapLong,
      rule: "Urodzenie przed 28. tc lub masa ≤ 1000 g — do 15. tygodnia po porodzie (art. 180² § 1 pkt 1 KP)",
    };
  }
  if (gw < 37) {
    return {
      weeks: Math.min(Math.ceil(hospitalDays / 7), p.supplementaryCapShort),
      cap: p.supplementaryCapShort,
      rule: "Urodzenie między 28. a 37. tc, masa > 1000 g — do 8. tygodnia po porodzie (art. 180² § 1 pkt 2 KP)",
    };
  }
  const startOk = hospitalStartDay === undefined || (hospitalStartDay >= 5 && hospitalStartDay <= 28);
  if (hospitalDays < 2 || !startOk) {
    return {
      weeks: 0,
      cap: p.supplementaryCapShort,
      rule: "Urodzenie po 37. tc — wymagany pobyt w szpitalu min. 2 kolejne dni, z pierwszym dniem między 5. a 28. dniem po porodzie (art. 180² § 1 pkt 3 KP)",
    };
  }
  return {
    weeks: Math.min(Math.ceil(hospitalDays / 7), p.supplementaryCapShort),
    cap: p.supplementaryCapShort,
    rule: "Urodzenie po 37. tc, hospitalizacja od 5. dnia — do 8. tygodnia po porodzie (art. 180² § 1 pkt 3 KP)",
  };
}

let seq = 0;
const sid = (k: string) => `${k}-${++seq}`;

export function buildTimeline(s: ScenarioParsed, ctx: TimelineContext, p: LegalParams): TimelineResult {
  seq = 0;
  const segments: RawSegment[] = [];
  const validation: string[] = [];
  const trace: TraceStep[] = [];
  const plan = s.plan;
  const isAdoption = s.event === "adoption" || s.event === "foster";

  const eventDate = isAdoption ? (s.placementDate ?? null) : (s.birthDate ?? s.dueDate ?? null);
  const result: TimelineResult = {
    segments,
    eventDate,
    weeks: {
      maternity: 0,
      parentalPool: 0,
      parentalUsedMother: 0,
      parentalUsedFather: 0,
      parentalUnused: 0,
      supplementary: 0,
      paternity: 0,
    },
    averagedEffective: false,
    parentalDeadline: null,
    paternityDeadline: null,
    adoptionShort: false,
    notEligibleReason: null,
    validation,
    trace,
  };
  if (!eventDate) {
    validation.push(isAdoption ? "Podaj datę przyjęcia dziecka." : "Podaj datę porodu lub przewidywaną datę porodu.");
    return result;
  }

  const children = s.loss ? Math.max(s.loss.survivingChildren, 0) : s.childrenCount;

  /* ───────────── Strata dziecka ───────────── */
  if (s.loss && s.loss.survivingChildren === 0 && !isAdoption) {
    const birth = eventDate;
    const death = s.loss.type === "stillbirth" ? birth : (s.loss.deathDate ?? birth);
    const ageDays = diffDays(birth, death);
    let end: string;
    let rule: string;
    if (ageDays < p.lossEarlyDeathWeeks * 7) {
      end = maxDate(endOf(birth, p.lossMaternityWeeks * 7), endOf(death, p.lossMinDaysAfterDeath));
      rule =
        s.loss.type === "stillbirth"
          ? "Martwe urodzenie — 8 tygodni po porodzie"
          : "Zgon przed upływem 8 tygodni życia — 8 tygodni po porodzie, nie krócej niż 7 dni od zgonu";
    } else {
      end = endOf(death, p.lossMinDaysAfterDeath);
      rule = "Zgon po upływie 8 tygodni życia — zasiłek przez 7 dni od dnia zgonu";
    }
    if (ctx.motherCovered) {
      if (plan.prenatalWeeks > 0) {
        segments.push({
          id: sid("prenatal"),
          parent: "mother",
          kind: "prenatal",
          label: "Macierzyński przed porodem",
          start: addDays(birth, -plan.prenatalWeeks * 7),
          days: plan.prenatalWeeks * 7,
          rate: p.rates.maternity,
          workFraction: 0,
          legal: [KP("art. 180 § 2"), UZ("art. 31 ust. 1")],
        });
      }
      const start = birth;
      segments.push({
        id: sid("loss"),
        parent: "mother",
        kind: "loss",
        label: "Zasiłek macierzyński po stracie dziecka",
        start,
        days: spanDays(start, end),
        rate: p.rates.maternity,
        workFraction: 0,
        legal: [KP("art. 180¹"), UZ("art. 29a ust. 1, art. 31 ust. 1")],
      });
      trace.push({
        id: "loss.rule",
        label: "Wymiar zasiłku po stracie dziecka",
        value: `${spanDays(start, end)} dni (do ${fmt(end)})`,
        formula: rule,
        legal: [KP("art. 180¹ § 1–2")],
        source: "reguła",
      });
    }
    return result;
  }

  /* ───────────── Przysposobienie / rodzina zastępcza ───────────── */
  let maternityBlockStart = eventDate;
  let W: number;
  let pool: number;
  let parentalHardEnd: string | null = null;

  if (isAdoption) {
    if (!s.childBirthDate) {
      validation.push("Podaj datę urodzenia przyjmowanego dziecka.");
      return result;
    }
    const age = ageInYears(s.childBirthDate, eventDate);
    const limit =
      s.event === "adoption"
        ? p.adoptionChildAgeLimit
        : s.schoolDeferred
          ? p.fosterChildAgeLimitDeferred
          : p.fosterChildAgeLimit;
    trace.push({
      id: "adoption.age",
      label: "Wiek dziecka w dniu przyjęcia / limit",
      value: `${age} lat / ${limit} lat`,
      legal: [UZ("art. 29 ust. 1 pkt 2–3"), KP("art. 183 § 1, § 1¹")],
      source: "reguła",
    });
    if (age >= limit) {
      result.notEligibleReason =
        s.event === "adoption"
          ? `Zasiłek przysługuje przy przyjęciu dziecka do ukończenia ${limit}. roku życia — dziecko ma ${age} lat.`
          : `Rodzina zastępcza niezawodowa: zasiłek przy przyjęciu dziecka do ukończenia ${limit}. roku życia${s.schoolDeferred ? " (odroczony obowiązek szkolny)" : ""} — dziecko ma ${age} lat.`;
      return result;
    }
    const limitDate = addDays(addYears(s.childBirthDate, limit), -1);
    W = maternityWeeks(s.childrenCount, p);
    const naturalEnd = endOf(eventDate, W * 7);
    let adoptionDays = W * 7;
    if (naturalEnd > limitDate) {
      const capped = spanDays(eventDate, limitDate);
      if (capped < p.adoptionMinWeeks * 7) {
        adoptionDays = p.adoptionMinWeeks * 7;
        result.adoptionShort = true;
      } else {
        adoptionDays = capped;
      }
    }
    pool = result.adoptionShort
      ? s.zaZyciem
        ? p.parentalWeeks.adoptionShortZaZyciem
        : p.parentalWeeks.adoptionShort
      : parentalPool(s.childrenCount, s.zaZyciem, p);
    if (s.event === "adoption") parentalHardEnd = addDays(addYears(s.childBirthDate, p.adoptionChildAgeLimit), -1);
    result.weeks.maternity = Math.round((adoptionDays / 7) * 10) / 10;
    trace.push({
      id: "adoption.weeks",
      label: "Urlop na warunkach urlopu macierzyńskiego",
      value: `${adoptionDays} dni${result.adoptionShort ? " (minimum 9 tygodni)" : ""}`,
      formula: `${W} tyg. wg liczby dzieci, nie dłużej niż do ukończenia ${limit}. r.ż., nie krócej niż ${p.adoptionMinWeeks} tyg.`,
      legal: [KP("art. 183 § 1, § 1¹, § 3")],
      source: "reguła",
    });

    if (!ctx.motherCovered) {
      validation.push("Opiekun przyjmujący dziecko nie podlega ubezpieczeniu chorobowemu w dniu przyjęcia.");
    } else {
      const firstWeeks = Math.round(adoptionDays / 7);
      const keep = Math.min(plan.motherMaternityWeeksAfterBirth ?? firstWeeks, firstWeeks);
      const keepDays = keep >= firstWeeks ? adoptionDays : keep * 7;
      segments.push({
        id: sid("adoption"),
        parent: "mother",
        kind: "adoption_maternity",
        label: "Na warunkach urlopu macierzyńskiego",
        start: eventDate,
        days: keepDays,
        rate: plan.averaged ? p.rates.averaged : p.rates.maternity,
        workFraction: 0,
        legal: [KP("art. 183"), UZ("art. 29 ust. 1 pkt 2–3, art. 31 ust. 1")],
      });
      if (keepDays < adoptionDays && ctx.fatherCovered) {
        segments.push({
          id: sid("adoption"),
          parent: "father",
          kind: "adoption_maternity",
          label: "Na warunkach urlopu macierzyńskiego (drugi opiekun)",
          start: addDays(eventDate, keepDays),
          days: adoptionDays - keepDays,
          rate: plan.averaged ? p.rates.averaged : p.rates.maternity,
          workFraction: 0,
          legal: [KP("art. 183 § 2 w zw. z art. 180"), UZ("art. 29 ust. 4")],
        });
      }
    }
  } else {
    /* ───────────── Urodzenie ───────────── */
    const birth = eventDate;
    W = maternityWeeks(children, p);
    pool = parentalPool(children, s.zaZyciem, p);
    result.weeks.maternity = W;
    trace.push({
      id: "maternity.weeks",
      label: "Wymiar urlopu macierzyńskiego",
      value: `${W} tygodni`,
      formula: `${children} ${children === 1 ? "dziecko" : "dzieci"} przy jednym porodzie → ${W} tyg.`,
      legal: [KP("art. 180 § 1"), { act: "Załącznik", ref: "tabela wymiarów" }],
      source: "parametr",
    });

    if (ctx.motherCovered) {
      const prenatal = Math.min(plan.prenatalWeeks, p.prenatalMaxWeeks);
      const afterBirthTotal = W - prenatal;
      let motherAfter = plan.motherMaternityWeeksAfterBirth ?? afterBirthTotal;
      if (motherAfter > afterBirthTotal) motherAfter = afterBirthTotal;
      if (motherAfter < afterBirthTotal && motherAfter < p.motherExclusiveWeeksAfterBirth) {
        validation.push(
          `Matka musi wykorzystać co najmniej ${p.motherExclusiveWeeksAfterBirth} tygodni urlopu macierzyńskiego po porodzie — przyjęto ${p.motherExclusiveWeeksAfterBirth}.`,
        );
        motherAfter = p.motherExclusiveWeeksAfterBirth;
      }
      if (motherAfter < afterBirthTotal && !ctx.fatherCovered) {
        validation.push("Ojciec nie podlega ubezpieczeniu chorobowemu — nie może przejąć części urlopu macierzyńskiego.");
        motherAfter = afterBirthTotal;
      }
      if (prenatal > 0) {
        maternityBlockStart = addDays(birth, -prenatal * 7);
        segments.push({
          id: sid("prenatal"),
          parent: "mother",
          kind: "prenatal",
          label: "Macierzyński przed porodem",
          start: maternityBlockStart,
          days: prenatal * 7,
          rate: p.rates.maternity,
          workFraction: 0,
          legal: [KP("art. 180 § 2"), { act: "Poradnik ZUS 2026", ref: "s. 28 — 100% przed porodem" }],
        });
      }
      const matRate = plan.averaged ? p.rates.averaged : p.rates.maternity;
      const mu = plan.motherUnable;
      const pushMother = (fromWeek: number, weeks: number) =>
        weeks > 0 &&
        segments.push({
          id: sid("maternity"),
          parent: "mother",
          kind: "maternity",
          label: fromWeek === 0 ? "Urlop macierzyński" : "Urlop macierzyński (dalsza część)",
          start: addDays(birth, fromWeek * 7),
          days: weeks * 7,
          rate: matRate,
          workFraction: 0,
          legal: [KP("art. 180 § 1"), UZ("art. 29 ust. 1, art. 31 ust. 1 i 3")],
        });
      const pushFather = (fromWeek: number, weeks: number, label: string, legal: LegalRef[]) =>
        weeks > 0 &&
        segments.push({
          id: sid("maternity"),
          parent: "father",
          kind: "maternity_transfer",
          label,
          start: addDays(birth, fromWeek * 7),
          days: weeks * 7,
          rate: matRate,
          workFraction: 0,
          legal,
        });

      if (mu && ctx.fatherCovered) {
        /* Sytuacja szczególna: przejęcie przed upływem 14 tygodni */
        const minWeeks = mu.reason === "death" ? 0 : p.motherMinWeeksForSpecialTransfer;
        let at = Math.min(mu.afterWeeks, afterBirthTotal);
        if (at < minWeeks) {
          validation.push(
            `W tej sytuacji ojciec może przejąć urlop po wykorzystaniu przez matkę co najmniej ${minWeeks} tygodni po porodzie — przyjęto ${minWeeks}.`,
          );
          at = Math.min(minWeeks, afterBirthTotal);
        }
        const REF: Record<typeof mu.reason, { label: string; legal: LegalRef[] }> = {
          incapacity: { label: "Urlop macierzyński przejęty przez ojca (niezdolność matki do samodzielnej egzystencji)", legal: [KP("art. 180 § 6–7"), UZ("art. 29 ust. 5")] },
          hospital: { label: "Urlop macierzyński ojca na czas pobytu matki w szpitalu", legal: [KP("art. 180 § 10–11"), UZ("art. 29 ust. 6")] },
          death: { label: "Urlop macierzyński po śmierci matki dziecka", legal: [KP("art. 180 § 12"), UZ("art. 29 ust. 7")] },
          abandonment: { label: "Urlop macierzyński po porzuceniu dziecka przez matkę", legal: [KP("art. 180 § 13"), UZ("art. 29 ust. 7")] },
        };
        pushMother(0, at);
        if (mu.reason === "hospital") {
          const hw = Math.min(mu.hospitalWeeks ?? 1, afterBirthTotal - at);
          pushFather(at, hw, REF.hospital.label, REF.hospital.legal);
          pushMother(at + hw, afterBirthTotal - at - hw);
        } else {
          pushFather(at, afterBirthTotal - at, REF[mu.reason].label, REF[mu.reason].legal);
        }
        trace.push({
          id: "maternity.specialTransfer",
          label: "Przejęcie urlopu macierzyńskiego przez ojca (sytuacja szczególna)",
          value: `od ${at}. tygodnia po porodzie`,
          formula: mu.reason === "death" ? "Bez minimalnego okresu wykorzystanego przez matkę" : `Matka wykorzystała co najmniej ${minWeeks} tyg.`,
          legal: REF[mu.reason].legal,
          source: "reguła",
        });
      } else {
        if (mu && !ctx.fatherCovered) {
          validation.push("Ojciec nie podlega ubezpieczeniu chorobowemu — nie może przejąć urlopu macierzyńskiego.");
        }
        pushMother(0, motherAfter);
        if (motherAfter < afterBirthTotal) {
          pushFather(motherAfter, afterBirthTotal - motherAfter, "Część urlopu macierzyńskiego przejęta od matki", [
            KP("art. 180 § 4"),
            UZ("art. 29 ust. 3"),
          ]);
        }
      }
    } else if (ctx.fatherCovered && plan.motherUnable && plan.motherUnable.reason !== "hospital") {
      /* KP art. 180 § 15: matka nieubezpieczona zmarła, porzuciła dziecko albo jest niezdolna do samodzielnej egzystencji */
      const at = Math.min(plan.motherUnable.afterWeeks, W);
      segments.push({
        id: sid("maternity"),
        parent: "father",
        kind: "maternity_transfer",
        label: "Urlop macierzyński ojca (matka nieubezpieczona)",
        start: addDays(birth, at * 7),
        days: (W - at) * 7,
        rate: plan.averaged ? p.rates.averaged : p.rates.maternity,
        workFraction: 0,
        legal: [KP("art. 180 § 15"), UZ("art. 29 ust. 9")],
      });
      trace.push({
        id: "maternity.motherNotInsuredTransfer",
        label: "Matka nieubezpieczona — urlop macierzyński dla ojca",
        value: `${W - at} tyg. od ${at}. tygodnia po porodzie`,
        legal: [KP("art. 180 § 15")],
        source: "reguła",
      });
    } else if (ctx.fatherCovered) {
      trace.push({
        id: "maternity.motherNotInsured",
        label: "Matka nieubezpieczona",
        value: "Ojciec może skorzystać z ojcowskiego i rodzicielskiego (bez 9 tygodni przypisanych matce)",
        legal: [UZ("art. 31 ust. 3h"), { act: "Poradnik ZUS 2026", ref: "s. 7–8 PDF zadania" }],
        source: "założenie",
      });
    }

    /* Uzupełniający urlop macierzyński */
    if (s.premature) {
      const sup = supplementaryWeeks(s.premature, p);
      const who: Parent = plan.supplementaryBy;
      const whoCovered = who === "mother" ? ctx.motherCovered : ctx.fatherCovered;
      trace.push({
        id: "supplementary.weeks",
        label: "Uzupełniający urlop macierzyński",
        value: `${sup.weeks} tyg. (limit ${sup.cap})`,
        formula: `${s.premature.hospitalDays} dni w szpitalu → ${sup.weeks} tyg. (niepełny tydzień w górę). ${sup.rule}`,
        legal: [KP("art. 180² § 1–3")],
        source: "reguła",
      });
      if (sup.weeks > 0 && whoCovered && segments.some((x) => x.kind === "maternity" || x.kind === "maternity_transfer")) {
        const lastMat = lastEnd(segments.filter((x) => x.kind === "maternity" || x.kind === "maternity_transfer"));
        segments.push({
          id: sid("supplementary"),
          parent: who,
          kind: "supplementary",
          label: "Uzupełniający urlop macierzyński",
          start: addDays(lastMat, 1),
          days: sup.weeks * 7,
          rate: p.rates.maternity,
          workFraction: 0,
          legal: [KP("art. 180²"), UZ("art. 29a ust. 1, art. 31 ust. 1")],
        });
        result.weeks.supplementary = sup.weeks;
      } else if (sup.weeks > 0 && !whoCovered) {
        validation.push("Uzupełniający urlop macierzyński może wykorzystać tylko rodzic objęty ubezpieczeniem chorobowym.");
      }
    }

    parentalHardEnd = endOfYear(yearOf(birth) + 6);
  }

  /* ───────────── Urlop rodzicielski ───────────── */
  result.weeks.parentalPool = pool;
  const excl = p.parentalExclusiveWeeks;
  const maxPerParent = pool - excl;
  let fatherW = ctx.fatherCovered ? plan.parentalFatherWeeks : 0;
  if (fatherW > maxPerParent) {
    validation.push(`Jeden rodzic może wykorzystać najwyżej ${maxPerParent} tyg. rodzicielskiego (9 tyg. należy do drugiego rodzica).`);
    fatherW = maxPerParent;
  }
  let motherW = ctx.motherCovered ? (plan.parentalMotherWeeks ?? Math.max(0, pool - excl - Math.max(0, fatherW - excl))) : 0;
  if (motherW > maxPerParent) {
    validation.push(`Jeden rodzic może wykorzystać najwyżej ${maxPerParent} tyg. rodzicielskiego (9 tyg. należy do drugiego rodzica).`);
    motherW = maxPerParent;
  }
  if (motherW + fatherW > pool) {
    validation.push(`Łącznie rodzice mogą wykorzystać ${pool} tyg. rodzicielskiego — skrócono część matki.`);
    motherW = pool - fatherW;
  }
  trace.push({
    id: "parental.pool",
    label: "Pula urlopu rodzicielskiego",
    value: `${pool} tyg. (w tym po ${excl} tyg. nieprzenoszalnych dla każdego rodzica)`,
    legal: isAdoption ? [KP("art. 183 § 4–4⁵")] : [KP("art. 182¹a § 1–4")],
    source: "parametr",
  });

  const afterMaternity = segments.length
    ? addDays(lastEnd(segments.filter((x) => x.kind !== "paternity")), 1)
    : addDays(eventDate, 0);

  // Wariant 81,5% wymaga wykorzystania choć jednego dnia rodzicielskiego w 1. roku życia dziecka (art. 31 ust. 3g)
  const firstYearEnd = addDays(addYears(isAdoption ? eventDate : eventDate, 1), -1);
  const anyParentalInFirstYear = (motherW > 0 || fatherW > 0) && afterMaternity <= firstYearEnd;
  result.averagedEffective = plan.averaged && anyParentalInFirstYear;
  if (plan.averaged && !anyParentalInFirstYear) {
    trace.push({
      id: "averaged.3g",
      label: "Wariant 81,5% bez rodzicielskiego w 1. roku życia",
      value: "Rodzicielski 70%, wyrównanie macierzyńskiego do 100% na wniosek",
      legal: [UZ("art. 31 ust. 3g i 4")],
      source: "reguła",
    });
    for (const seg of segments) if (seg.rate === p.rates.averaged) seg.rate = p.rates.maternity;
  }
  const sharedRate = result.averagedEffective ? p.rates.averaged : p.rates.parental;

  let motherParentalEnd = afterMaternity;
  if (motherW > 0) {
    segments.push({
      id: sid("parental"),
      parent: "mother",
      kind: "parental",
      label: "Urlop rodzicielski",
      start: afterMaternity,
      days: motherW * 7,
      rate: sharedRate,
      workFraction: 0,
      legal: [KP("art. 182¹a"), UZ(result.averagedEffective ? "art. 31 ust. 3" : "art. 31 ust. 2")],
    });
    motherParentalEnd = addDays(afterMaternity, motherW * 7);
  }

  if (fatherW > 0) {
    const fatherStart = plan.parentalConcurrent
      ? afterMaternity
      : ctx.motherCovered
        ? motherParentalEnd
        : addDays(eventDate, plan.paternity && ctx.fatherIsEmployee && s.event !== "foster" ? p.paternityWeeks * 7 : 0);
    const exclusivePart = Math.min(excl, fatherW);
    const sharedPart = fatherW - exclusivePart;
    segments.push({
      id: sid("parental"),
      parent: "father",
      kind: "parental_exclusive",
      label: "Rodzicielski — 9 tygodni drugiego rodzica",
      start: fatherStart,
      days: exclusivePart * 7,
      rate: p.rates.parental,
      workFraction: 0,
      legal: [KP("art. 182¹a § 4"), UZ("art. 31 ust. 3f")],
    });
    if (sharedPart > 0) {
      segments.push({
        id: sid("parental"),
        parent: "father",
        kind: "parental",
        label: "Urlop rodzicielski (część wspólna)",
        start: addDays(fatherStart, exclusivePart * 7),
        days: sharedPart * 7,
        rate: sharedRate,
        workFraction: 0,
        legal: [KP("art. 182¹a § 3"), UZ(result.averagedEffective ? "art. 30a ust. 3, art. 31 ust. 3" : "art. 31 ust. 2")],
      });
    }
  }
  result.weeks.parentalUsedMother = motherW;
  result.weeks.parentalUsedFather = fatherW;
  result.weeks.parentalUnused = pool - motherW - fatherW;

  /* Łączenie rodzicielskiego z pracą */
  if (plan.partTime) {
    applyPartTime(s, ctx, segments, validation, trace, pool, p);
  }

  /* Granica wykorzystania rodzicielskiego */
  result.parentalDeadline = parentalHardEnd;
  if (parentalHardEnd) {
    for (const seg of segments) {
      if (!seg.kind.startsWith("parental")) continue;
      const end = endOf(seg.start, seg.days);
      if (end > parentalHardEnd) {
        validation.push(`Urlop rodzicielski można wykorzystać najpóźniej do ${fmt(parentalHardEnd)} — skrócono plan.`);
        seg.days = Math.max(0, spanDays(seg.start, parentalHardEnd));
      }
    }
  }

  /* ───────────── Urlop ojcowski ───────────── */
  if (plan.paternity && s.father && s.event !== "foster") {
    const deadline = isAdoption
      ? addDays(addMonths(eventDate, p.paternityChildAgeMonths), -1)
      : addDays(addMonths(eventDate, p.paternityChildAgeMonths), -1);
    result.paternityDeadline =
      isAdoption && s.childBirthDate
        ? minIso(deadline, addDays(addYears(s.childBirthDate, p.adoptionChildAgeLimit), -1))
        : deadline;
    let fatherOk = ctx.fatherCovered;
    let start = plan.paternityStart ?? eventDate;
    // Ojciec, który zaczął pracę / ubezpieczenie dopiero po urodzeniu dziecka, też ma prawo do ojcowskiego
    // (do 12. miesiąca życia dziecka) — liczymy od dnia objęcia ubezpieczeniem.
    if (!fatherOk && s.father.insuranceStart && s.father.insuranceStart > eventDate) {
      start = maxDate(start, s.father.insuranceStart);
      fatherOk = coverageOn(s.father, start, { isMother: false, isBirth: !isAdoption, dueDate: s.dueDate }, p).covered;
      if (fatherOk) {
        trace.push({
          id: "paternity.lateStart",
          label: "Urlop ojcowski po podjęciu pracy",
          value: `od ${fmt(start)}`,
          formula: "Tata objęty ubezpieczeniem chorobowym po urodzeniu dziecka — ojcowski przysługuje, jeśli dziecko nie ukończyło 12 miesięcy",
          legal: [KP("art. 182³ § 1"), UZ("art. 29a ust. 1")],
          source: "reguła",
        });
      }
    }
    if (fatherOk) {
      if (start > result.paternityDeadline) {
        validation.push(`Urlop ojcowski trzeba wykorzystać do ${fmt(result.paternityDeadline)}.`);
      } else {
        segments.push({
          id: sid("paternity"),
          parent: "father",
          kind: "paternity",
          label: "Urlop ojcowski",
          start,
          days: p.paternityWeeks * 7,
          rate: p.rates.maternity,
          workFraction: 0,
          legal: [KP("art. 182³"), UZ("art. 29a ust. 1, art. 31 ust. 1")],
        });
        result.weeks.paternity = p.paternityWeeks;
      }
    }
  }

  segments.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.parent < b.parent ? -1 : 1));
  return result;
}

function applyPartTime(
  s: ScenarioParsed,
  ctx: TimelineContext,
  segments: RawSegment[],
  validation: string[],
  trace: TraceStep[],
  pool: number,
  p: LegalParams,
) {
  const pt = s.plan.partTime!;
  const isEmployee = pt.parent === "mother" ? ctx.motherIsEmployee : ctx.fatherIsEmployee;
  if (!isEmployee) {
    validation.push(
      "Łączenie urlopu rodzicielskiego z pracą u pracodawcy dotyczy pracowników (umowa o pracę). Przy zleceniu/JDG praca w trakcie zasiłku oznacza jego utratę za ten okres.",
    );
    return;
  }
  if (pt.fraction > p.partTimeMaxFraction) {
    validation.push(`Pracować można w wymiarze najwyżej ${p.partTimeMaxFraction * 100}% etatu — przyjęto ½ etatu.`);
  }
  const f = Math.min(pt.fraction, p.partTimeMaxFraction);
  const own = segments.filter((x) => x.parent === pt.parent && (x.kind === "parental" || x.kind === "parental_exclusive"));
  const ownWeeks = own.reduce((sum, x) => sum + x.days / 7, 0);
  if (ownWeeks === 0) {
    validation.push("Aby łączyć urlop rodzicielski z pracą, zaplanuj urlop rodzicielski dla tego rodzica.");
    return;
  }
  const w = Math.min(pt.weeks, ownWeeks);
  if (pt.weeks > ownWeeks) validation.push(`Łączenie z pracą ograniczono do ${ownWeeks} tyg. zaplanowanego rodzicielskiego.`);

  // Dzielimy segmenty rodzica: pierwsze `w` tygodni z pracą, reszta bez pracy.
  let remainingDays = w * 7;
  let lastRate = p.rates.parental;
  for (const seg of own.sort((a, b) => (a.start < b.start ? -1 : 1))) {
    if (remainingDays <= 0) break;
    lastRate = seg.rate;
    if (seg.days <= remainingDays) {
      seg.workFraction = f;
      remainingDays -= seg.days;
    } else {
      const rest: RawSegment = {
        ...seg,
        id: sid(seg.kind),
        start: addDays(seg.start, remainingDays),
        days: seg.days - remainingDays,
      };
      seg.days = remainingDays;
      seg.workFraction = f;
      segments.push(rest);
      remainingDays = 0;
    }
  }

  // Wydłużenie = liczba tygodni łączenia × wymiar pracy (KP art. 182¹f § 2); niepełny dzień się pomija.
  const extensionDays = Math.floor(w * 7 * f);
  const totalParentalWeeks = pool + extensionDays / 7;
  const cap = partTimeCap(s.childrenCount, s.zaZyciem, p);
  const allowedExt = Math.max(0, Math.min(extensionDays, Math.floor((cap - pool) * 7)));
  if (totalParentalWeeks > cap) validation.push(`Urlop rodzicielski z wydłużeniem nie może przekroczyć ${cap} tyg.`);

  const ownAll = segments.filter((x) => x.parent === pt.parent && x.kind.startsWith("parental"));
  const extStart = addDays(lastEnd(ownAll), 1);
  // Przesuń późniejsze segmenty rodzicielskie drugiego rodzica (plan sekwencyjny), żeby nie nachodziły na wydłużenie.
  if (!s.plan.parentalConcurrent) {
    for (const seg of segments) {
      if (seg.parent !== pt.parent && seg.kind.startsWith("parental") && seg.start >= extStart) {
        seg.start = addDays(seg.start, allowedExt);
      }
    }
  }
  if (allowedExt > 0) {
    segments.push({
      id: sid("parental_extension"),
      parent: pt.parent,
      kind: "parental_extension",
      label: "Wydłużenie rodzicielskiego (łączenie z pracą)",
      start: extStart,
      days: allowedExt,
      rate: lastRate,
      workFraction: 0,
      legal: [KP("art. 182¹f § 1–4"), UZ("art. 29a ust. 1")],
    });
  }
  trace.push({
    id: "parttime",
    label: "Łączenie urlopu rodzicielskiego z pracą",
    value: `${w} tyg. pracy na ${Math.round(f * 100)}% etatu → zasiłek × ${(1 - f).toFixed(2)}, wydłużenie o ${allowedExt} dni`,
    formula: `wydłużenie = ${w} tyg. × ${f} = ${(w * f).toFixed(1)} tyg. (niepełne dni pomija się)`,
    legal: [KP("art. 182¹e, 182¹f"), UZ("art. 31 ust. 4a")],
    source: "reguła",
  });
}

export function lastEnd(segs: RawSegment[]): string {
  return segs.reduce((acc, x) => maxDate(acc, endOf(x.start, x.days)), "0000-01-01");
}

function minIso(a: string, b: string) {
  return a < b ? a : b;
}
