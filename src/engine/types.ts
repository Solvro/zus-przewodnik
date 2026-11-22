import { z } from "zod";

// Komunikaty walidacji po polsku — wspólne dla API i formularzy
z.config(z.locales.pl());

/* ─────────────────────────── Wejście ─────────────────────────── */

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data w formacie RRRR-MM-DD");

/** Tytuł ubezpieczenia (forma pracy). */
export const InsuranceTitle = z.enum(["employment", "mandate", "business", "none"]);
export type InsuranceTitle = z.infer<typeof InsuranceTitle>;

export const MonthIncome = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // RRRR-MM
  gross: z.number().nonnegative(), // wynagrodzenie brutto (składniki miesięczne)
  /** false = przepracowano < ½ czasu pracy z przyczyn usprawiedliwionych → miesiąc pomijany */
  workedAtLeastHalf: z.boolean().default(true),
});
export type MonthIncome = z.infer<typeof MonthIncome>;

export const BasisInput = z.discriminatedUnion("mode", [
  /** Podstawa już ustalona (np. z Z-3 / decyzji) — po odliczeniu 13,71%. */
  z.object({ mode: z.literal("direct"), monthlyBasis: z.number().positive() }),
  /** Szybki szacunek z miesięcznej pensji brutto. */
  z.object({ mode: z.literal("gross"), monthlyGross: z.number().positive() }),
  /** Dokładnie: wynagrodzenia z 12 miesięcy + premie kwartalne/roczne (pracownik). */
  z.object({
    mode: z.literal("months"),
    months: z.array(MonthIncome).min(1).max(12),
    quarterlyBonusesLast4: z.array(z.number().nonnegative()).max(4).default([]),
    annualBonusLastYear: z.number().nonnegative().default(0),
  }),
  /** Niepracownik: zadeklarowane/osiągnięte podstawy składek chorobowych z kolejnych pełnych miesięcy. */
  z.object({
    mode: z.literal("declared"),
    monthlyBases: z.array(z.number().nonnegative()).max(12),
    /** JDG: rodzaj najniższej podstawy (art. 48a). */
    minBaseType: z.enum(["standard", "preferential", "none"]).default("standard"),
    /** Kwota z umowy (zlecenie) — gdy brak pełnego miesiąca ubezpieczenia (art. 49). */
    contractMonthlyAmount: z.number().nonnegative().optional(),
  }),
]);
export type BasisInput = z.infer<typeof BasisInput>;

export const ParentInput = z.object({
  title: InsuranceTitle,
  /** Zlecenie / JDG: czy zgłoszono dobrowolne ubezpieczenie chorobowe. */
  voluntarySickness: z.boolean().default(false),
  insuranceStart: isoDate.optional(),
  /** Koniec umowy / działalności (null = trwa). */
  insuranceEnd: isoDate.nullable().default(null),
  contractType: z.enum(["indefinite", "fixed", "trial"]).optional(),
  /** Powód ustania ubezpieczenia — dla zasiłku po ustaniu. */
  endReason: z.enum(["regular", "bankruptcy", "liquidation", "employer_death", "unlawful_court"]).optional(),
  /** Liczba ubezpieczonych zgłaszanych przez płatnika (stan na 30.11 r.p.). */
  payerInsuredCount: z.number().int().nonnegative().optional(),
  fullTime: z.boolean().default(true),
  age: z.number().int().min(15).max(80).optional(),
  basis: BasisInput.optional(),
  /** JDG: zaległość składkowa na dzień powstania prawa. */
  contributionDebt: z.number().nonnegative().default(0),
  /** Podwyższenie podstawy składek w ciąży (do analizy ryzyka). */
  basisRaisedDuringPregnancy: z.boolean().default(false),
});
export type ParentInput = z.infer<typeof ParentInput>;

export const SickLeave = z.object({
  from: isoDate,
  to: isoDate,
  pregnancyCodeB: z.boolean().default(true),
});
export type SickLeave = z.infer<typeof SickLeave>;

export const Scenario = z.object({
  /** Zdarzenie: ciąża (przed porodem), urodzenie, przysposobienie, rodzina zastępcza niezawodowa. */
  event: z.enum(["pregnancy", "birth", "adoption", "foster"]),
  /** Data „dzisiaj” — do terminów i statusów (domyślnie data systemowa). */
  today: isoDate.optional(),
  dueDate: isoDate.optional(),
  birthDate: isoDate.optional(),
  /** Przysposobienie / rodzina zastępcza: data przyjęcia dziecka. */
  placementDate: isoDate.optional(),
  /** Przysposobienie / rodzina zastępcza: data urodzenia dziecka. */
  childBirthDate: isoDate.optional(),
  schoolDeferred: z.boolean().default(false),
  childrenCount: z.number().int().min(1).max(10).default(1),
  zaZyciem: z.boolean().default(false),
  premature: z
    .object({
      gestationWeek: z.number().int().min(20).max(44),
      birthWeightG: z.number().int().min(200).max(7000),
      /** Łączna liczba dni pobytu w szpitalu (najdłużej hospitalizowane dziecko) w okresie liczonym do limitu. */
      hospitalDays: z.number().int().min(0).max(200),
      /** Dla urodzonych ≥37 tc: dzień po porodzie, w którym zaczął się pobyt (5.–28.). */
      hospitalStartDay: z.number().int().min(0).max(200).optional(),
    })
    .optional(),
  loss: z
    .object({
      type: z.enum(["stillbirth", "death"]),
      deathDate: isoDate.optional(),
      survivingChildren: z.number().int().min(0).default(0),
    })
    .optional(),
  /** Osoba przyjmująca dziecko / główny opiekun przy adopcji („mother” = pierwszy opiekun). */
  mother: ParentInput,
  father: ParentInput.optional(),
  sickLeaves: z.array(SickLeave).default([]),
  plan: z
    .object({
      averaged: z.boolean().default(false),
      prenatalWeeks: z.number().int().min(0).max(6).default(0),
      /** Ile tygodni urlopu macierzyńskiego po porodzie wykorzysta matka (reszta → ojciec). */
      motherMaternityWeeksAfterBirth: z.number().int().min(1).max(37).optional(),
      parentalMotherWeeks: z.number().int().min(0).max(67).optional(),
      parentalFatherWeeks: z.number().int().min(0).max(67).default(0),
      /** Rodzice korzystają z rodzicielskiego jednocześnie (od tego samego dnia). */
      parentalConcurrent: z.boolean().default(false),
      paternity: z.boolean().default(true),
      /**
       * Sytuacja szczególna matki — ojciec przejmuje urlop macierzyński wcześniej niż po 14 tygodniach
       * (KP art. 180 § 6–7 niezdolność do samodzielnej egzystencji, § 10–11 szpital, § 12 zgon, § 13 porzucenie,
       * § 15 — gdy matka nie była ubezpieczona). afterWeeks = tydzień po porodzie, w którym nastąpiło zdarzenie.
       */
      motherUnable: z
        .object({
          reason: z.enum(["incapacity", "hospital", "death", "abandonment"]),
          afterWeeks: z.number().int().min(0).max(37),
          hospitalWeeks: z.number().int().min(1).max(37).optional(),
        })
        .optional(),
      paternityStart: isoDate.optional(),
      supplementaryBy: z.enum(["mother", "father"]).default("mother"),
      partTime: z
        .object({
          parent: z.enum(["mother", "father"]),
          fraction: z.number().gt(0).max(1),
          weeks: z.number().int().min(1).max(86),
        })
        .optional(),
    })
    .default({
      averaged: false,
      prenatalWeeks: 0,
      parentalFatherWeeks: 0,
      parentalConcurrent: false,
      paternity: true,
      supplementaryBy: "mother",
    }),
});
export type Scenario = z.input<typeof Scenario>;
export type ScenarioParsed = z.output<typeof Scenario>;

/* ─────────────────────────── Wyjście ─────────────────────────── */

export type Parent = "mother" | "father";

export type BenefitKind =
  | "sick_pay" // wynagrodzenie chorobowe (pracodawca)
  | "sickness" // zasiłek chorobowy w ciąży
  | "rehab" // świadczenie rehabilitacyjne
  | "post_termination" // zasiłek w wysokości zasiłku macierzyńskiego (po ustaniu)
  | "prenatal" // macierzyński przed porodem
  | "maternity"
  | "maternity_transfer" // część macierzyńskiego przejęta przez ojca
  | "adoption_maternity" // na warunkach urlopu macierzyńskiego
  | "supplementary"
  | "parental"
  | "parental_exclusive" // 9 tyg. drugiego rodzica (70%)
  | "parental_extension" // wydłużenie przy łączeniu z pracą
  | "paternity"
  | "loss"; // macierzyński po stracie dziecka

export interface LegalRef {
  act: "ustawa zasiłkowa" | "Kodeks pracy" | "rozporządzenie" | "ustawa o sus" | "Poradnik ZUS 2026" | "Załącznik";
  ref: string;
}

export interface TraceStep {
  id: string;
  label: string;
  value: string;
  formula?: string;
  legal?: LegalRef[];
  source: "parametr" | "dane" | "reguła" | "założenie";
}

export interface BasisResult {
  monthlyBasis: number;
  method: string;
  minimumApplied: boolean;
  capApplied: boolean;
  steps: TraceStep[];
}

export type EligibilityStatus = "eligible" | "not_eligible" | "at_risk" | "info";

export interface Eligibility {
  benefit: BenefitKind | "maternity_any";
  parent: Parent;
  status: EligibilityStatus;
  title: string;
  reasons: string[];
  legal: LegalRef[];
}

export interface Segment {
  id: string;
  parent: Parent;
  kind: BenefitKind;
  label: string;
  start: string;
  end: string;
  days: number;
  rate: number; // np. 1, 0.815, 0.7
  workFraction: number; // 0 = nie pracuje; 0,5 = łączy z pracą na ½ etatu
  monthlyAmount: number; // brutto, po uwzględnieniu łączenia z pracą
  dailyAmount: number;
  total: number;
  paidBy: "employer" | "payer" | "zus";
  legal: LegalRef[];
}

export interface MonthlyRow {
  month: string; // RRRR-MM
  mother: number;
  father: number;
  total: number;
}

export type RiskLevel = "high" | "medium" | "info" | "positive";

export interface Risk {
  id: string;
  level: RiskLevel;
  parent?: Parent;
  title: string;
  description: string;
  action?: string;
  legal: LegalRef[];
}

export interface DocumentItem {
  id: string;
  parent: Parent;
  name: string;
  code?: string; // ZAM, Z-3, Z-3a, ZAS-53 …
  submitTo: "employer" | "zus" | "payer" | "none";
  channel: string; // „u pracodawcy (papier/elektronicznie)”, „eZUS” …
  when: string;
  required: boolean;
  note?: string;
}

export interface Deadline {
  id: string;
  parent: Parent;
  date: string;
  title: string;
  description: string;
  kind: "must" | "should" | "expires";
  passed: boolean;
}

export interface CalculationResult {
  paramsId: string;
  scenarioEvent: ScenarioParsed["event"];
  eventDate: string | null;
  bases: Partial<Record<Parent, BasisResult>>;
  payer: Partial<Record<Parent, { who: "payer" | "zus" | "unknown"; reason: string }>>;
  eligibility: Eligibility[];
  segments: Segment[];
  monthly: MonthlyRow[];
  totals: { mother: number; father: number; all: number; netEstimate: number };
  weeks: {
    maternity: number;
    parentalPool: number;
    parentalUsedMother: number;
    parentalUsedFather: number;
    parentalUnused: number;
    supplementary: number;
    paternity: number;
  };
  returnToWork: Partial<Record<Parent, string>>;
  risks: Risk[];
  documents: DocumentItem[];
  deadlines: Deadline[];
  trace: TraceStep[];
  validation: string[];
}
