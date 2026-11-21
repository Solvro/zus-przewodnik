import { computeBasis } from "./basis";
import { addDays, diffDays, fmt, maxDate, todayIso } from "./dates";
import { buildDeadlines, buildDocuments } from "./documents";
import { coverageOn, whoPays, type CoverageResult } from "./insurance";
import { buildTimeline, type RawSegment } from "./leave";
import { selectParams, round2, type LegalParams } from "./params";
import { monthlyBreakdown, netEstimate, priceSegments } from "./payments";
import { assessRisks } from "./risks";
import { computeSickness } from "./sickness";
import {
  Scenario,
  type BasisResult,
  type CalculationResult,
  type Eligibility,
  type Parent,
  type ScenarioParsed,
  type TraceStep,
} from "./types";

export * from "./types";
export { PARAMS_2026, DEFAULT_PARAM_SETS, selectParams, derived } from "./params";
export type { LegalParams } from "./params";

const KIND_TITLES: Record<string, string> = {
  prenatal: "Zasiłek macierzyński przed porodem",
  maternity: "Zasiłek macierzyński — urlop macierzyński",
  maternity_transfer: "Zasiłek macierzyński — przejęta część urlopu macierzyńskiego",
  adoption_maternity: "Zasiłek macierzyński — urlop na warunkach urlopu macierzyńskiego",
  supplementary: "Zasiłek macierzyński — uzupełniający urlop macierzyński",
  parental: "Zasiłek macierzyński — urlop rodzicielski",
  parental_exclusive: "Zasiłek macierzyński — 9 tygodni rodzicielskiego drugiego rodzica",
  parental_extension: "Zasiłek macierzyński — wydłużenie rodzicielskiego",
  paternity: "Zasiłek macierzyński — urlop ojcowski",
  loss: "Zasiłek macierzyński po stracie dziecka",
  post_termination: "Zasiłek w wysokości zasiłku macierzyńskiego (do porodu)",
};

export interface CalculateOptions {
  params?: LegalParams;
  paramSets?: LegalParams[];
}

/** Główna funkcja silnika: scenariusz → pełny, wyjaśnialny wynik. Czysta i deterministyczna. */
export function calculate(input: Scenario, opts: CalculateOptions = {}): CalculationResult {
  const s: ScenarioParsed = Scenario.parse(input);
  const today = s.today ?? todayIso();
  const isAdoption = s.event === "adoption" || s.event === "foster";
  const eventDate = isAdoption ? (s.placementDate ?? null) : (s.birthDate ?? s.dueDate ?? null);
  const p = opts.params ?? selectParams(eventDate ?? today, opts.paramSets);
  const trace: TraceStep[] = [
    {
      id: "params",
      label: "Zestaw parametrów prawnych",
      value: p.label,
      source: "parametr",
    },
  ];
  const validation: string[] = [];

  /* Ubezpieczenie w dniu powstania prawa */
  const covDate = eventDate ?? today;
  const coverage: { mother: CoverageResult; father?: CoverageResult } = {
    mother: coverageOn(s.mother, covDate, { dueDate: s.dueDate, isMother: true, isBirth: !isAdoption }, p),
    father: s.father
      ? coverageOn(s.father, covDate, { dueDate: s.dueDate, isMother: false, isBirth: !isAdoption }, p)
      : undefined,
  };

  /* Podstawa wymiaru */
  const bases: Partial<Record<Parent, BasisResult>> = {};
  for (const who of ["mother", "father"] as const) {
    const parent = who === "mother" ? s.mother : s.father;
    if (!parent) continue;
    const covered = who === "mother" ? coverage.mother.covered : coverage.father?.covered;
    if (parent.basis) {
      bases[who] = computeBasis(parent.basis, { title: parent.title, fullTime: parent.fullTime }, p);
      trace.push(...bases[who]!.steps.map((x) => ({ ...x, id: `${who}.${x.id}`, label: `${who === "mother" ? "Mama" : "Tata"}: ${x.label}` })));
    } else if (covered) {
      validation.push(
        `${who === "mother" ? "Mama" : "Tata"}: podaj wynagrodzenie lub podstawę wymiaru, aby policzyć kwoty.`,
      );
    }
  }

  /* Kto wypłaca */
  const payer: CalculationResult["payer"] = {};
  if (s.mother) payer.mother = whoPays(s.mother, p);
  if (s.father) payer.father = whoPays(s.father, p);
  if (coverage.mother.postTermination) {
    payer.mother = { who: "zus", reason: "Po ustaniu ubezpieczenia zasiłek wypłaca ZUS." };
  }

  /* Oś czasu */
  const timeline = buildTimeline(
    s,
    {
      motherCovered: coverage.mother.covered,
      fatherCovered: !!coverage.father?.covered,
      motherIsEmployee: s.mother.title === "employment",
      fatherIsEmployee: s.father?.title === "employment",
    },
    p,
  );
  validation.push(...timeline.validation);
  trace.push(...timeline.trace);

  const raw: RawSegment[] = [...timeline.segments];

  /* Zasiłek w wysokości zasiłku macierzyńskiego po ustaniu ubezpieczenia (do porodu) */
  if (coverage.mother.postTerminationBenefitUntilBirth && s.mother.insuranceEnd && eventDate) {
    const start = addDays(s.mother.insuranceEnd, 1);
    const days = diffDays(start, eventDate);
    if (days > 0)
      raw.push({
        id: "post_termination-1",
        parent: "mother",
        kind: "post_termination",
        label: "Zasiłek w wysokości zasiłku macierzyńskiego",
        start,
        days,
        rate: p.rates.maternity,
        workFraction: 0,
        legal: [{ act: "ustawa zasiłkowa", ref: "art. 30 ust. 3" }],
      });
  }

  /* Chorobowy w ciąży */
  const maternityStart =
    raw.filter((x) => x.parent === "mother" && x.kind !== "paternity").map((x) => x.start).sort()[0] ?? null;
  const sickness = computeSickness(s, maternityStart, p);
  raw.push(...sickness.segments);
  trace.push(...sickness.trace);

  /* Kwoty */
  const basisNumbers: Partial<Record<Parent, number>> = {
    mother: bases.mother?.monthlyBasis,
    father: bases.father?.monthlyBasis,
  };
  const paidBy: Partial<Record<Parent, "payer" | "zus">> = {
    mother: payer.mother?.who === "payer" ? "payer" : "zus",
    father: payer.father?.who === "payer" ? "payer" : "zus",
  };
  const segments = priceSegments(raw, basisNumbers, paidBy, p)
    .map((x) => (x.kind === "post_termination" ? { ...x, paidBy: "zus" as const } : x))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const monthly = monthlyBreakdown(segments);
  const totals = {
    mother: round2(segments.filter((x) => x.parent === "mother").reduce((a, x) => a + x.total, 0)),
    father: round2(segments.filter((x) => x.parent === "father").reduce((a, x) => a + x.total, 0)),
    all: 0,
    netEstimate: netEstimate(monthly, p),
  };
  totals.all = round2(totals.mother + totals.father);

  /* Uprawnienia */
  const eligibility: Eligibility[] = [...sickness.eligibility];
  const motherLabel = isAdoption ? "Opiekun 1" : "Mama";
  const covM = coverage.mother;
  eligibility.unshift({
    benefit: "maternity_any",
    parent: "mother",
    status: timeline.notEligibleReason ? "not_eligible" : covM.blockedByDebt ? "at_risk" : covM.covered ? "eligible" : "not_eligible",
    title: `${motherLabel}: zasiłek macierzyński`,
    reasons: [...(timeline.notEligibleReason ? [timeline.notEligibleReason] : []), ...covM.reasons],
    legal: covM.legal,
  });
  if (s.father && coverage.father) {
    const covF = coverage.father;
    eligibility.push({
      benefit: "maternity_any",
      parent: "father",
      status: covF.blockedByDebt ? "at_risk" : covF.covered ? "eligible" : "not_eligible",
      title: `${isAdoption ? "Opiekun 2" : "Tata"}: zasiłek macierzyński (ojcowski, rodzicielski, przejęty macierzyński)`,
      reasons: [
        ...covF.reasons,
        ...(s.event === "foster" ? ["Urlop ojcowski nie przysługuje rodzinie zastępczej — tylko przy urodzeniu lub przysposobieniu."] : []),
      ],
      legal: covF.legal,
    });
  }
  const byKind = new Map<string, typeof segments>();
  for (const seg of segments) {
    if (seg.kind === "sick_pay" || seg.kind === "sickness") continue;
    const key = `${seg.parent}:${seg.kind}`;
    byKind.set(key, [...(byKind.get(key) ?? []), seg]);
  }
  for (const [key, segs] of byKind) {
    const [parent, kind] = key.split(":") as [Parent, string];
    const days = segs.reduce((a, x) => a + x.days, 0);
    const total = round2(segs.reduce((a, x) => a + x.total, 0));
    const first = segs[0];
    eligibility.push({
      benefit: kind as Eligibility["benefit"],
      parent,
      status: (parent === "mother" ? covM : coverage.father)?.blockedByDebt ? "at_risk" : "eligible",
      title: KIND_TITLES[kind] ?? first.label,
      reasons: [
        `${days} dni (${(days / 7).toFixed(days % 7 ? 1 : 0)} tyg.), od ${fmt(first.start)} do ${fmt(segs.at(-1)!.end)}.`,
        `${Math.round(first.rate * 1000) / 10}% podstawy${first.workFraction ? `, pomniejszone o ${Math.round(first.workFraction * 100)}% (praca w trakcie urlopu)` : ""} — ${first.monthlyAmount.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł/mies. brutto, razem ${total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł.`,
      ],
      legal: first.legal,
    });
  }
  if (s.premature && timeline.weeks.supplementary === 0) {
    eligibility.push({
      benefit: "supplementary",
      parent: s.plan.supplementaryBy,
      status: "not_eligible",
      title: "Uzupełniający urlop macierzyński",
      reasons: [timeline.trace.find((t) => t.id === "supplementary.weeks")?.formula ?? "Warunki nie są spełnione."],
      legal: [{ act: "Kodeks pracy", ref: "art. 180²" }],
    });
  }

  /* Ryzyka, dokumenty, terminy */
  const risks = assessRisks({ s, timeline, coverage, today, p });
  const docCtx = { s, timeline, segments, coverage, payer, today, p };
  const documents = buildDocuments(docCtx);
  const deadlines = buildDeadlines(docCtx);

  /* Powrót do pracy */
  const returnToWork: CalculationResult["returnToWork"] = {};
  for (const who of ["mother", "father"] as const) {
    const leaveSegs = segments.filter((x) => x.parent === who && !["sick_pay", "sickness", "post_termination"].includes(x.kind));
    if (leaveSegs.length) returnToWork[who] = addDays(leaveSegs.reduce((a, x) => maxDate(a, x.end), "0000-01-01"), 1);
  }

  for (const who of ["mother", "father"] as const) {
    const pw = payer[who];
    if (pw) trace.push({ id: `${who}.payer`, label: `${who === "mother" ? "Mama" : "Tata"}: kto wypłaca`, value: pw.who === "payer" ? "płatnik składek" : pw.who === "zus" ? "ZUS" : "do ustalenia", formula: pw.reason, legal: [{ act: "ustawa zasiłkowa", ref: "art. 61 ust. 1" }], source: "reguła" });
  }

  return {
    paramsId: p.id,
    scenarioEvent: s.event,
    eventDate,
    bases,
    payer,
    eligibility,
    segments,
    monthly,
    totals,
    weeks: timeline.weeks,
    returnToWork,
    risks,
    documents,
    deadlines,
    trace,
    validation,
  };
}
