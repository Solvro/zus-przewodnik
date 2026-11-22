import type { ExtractedCase } from "@/ai/case-mapping";

/**
 * Fikcyjne przykładowe sprawy (dane odczytane z dokumentów + rozstrzygnięcie).
 * Pozwalają przetestować tryb „Sprawa ZUS” bez AI. Prawdziwe zestawy ZUS umieszcza się
 * w katalogu private-cases/ (poza repozytorium) — patrz README.
 */
export interface SampleCase {
  id: string;
  title: string;
  description: string;
  extracted: ExtractedCase;
}

const base = (o: Partial<ExtractedCase>): ExtractedCase => ({
  documents: [],
  insured: { role: "mother", firstName: null, lastName: null },
  insuranceTitle: "employment",
  sicknessInsurance: "mandatory",
  insuranceFrom: null,
  insuranceTo: null,
  payerInsuredCount: null,
  fullTime: true,
  monthlyIncomes: [],
  quarterlyBonuses: [],
  annualBonus: null,
  declaredBases: [],
  benefitBasis: null,
  childBirthDate: null,
  dueDate: null,
  placementDate: null,
  adoptedChildBirthDate: null,
  childrenCount: 1,
  requestedBenefit: "maternity",
  requestedPeriods: [],
  averaged815: false,
  contributionDebt: null,
  zusDecision: { outcome: "unknown", monthlyAmount: null, reason: null },
  uncertainFields: [],
  notes: [],
  ...o,
});

const months = (from: string, n: number, gross: number, low: number[] = []) =>
  Array.from({ length: n }, (_, i) => {
    const [y, m] = from.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    return { month: d.toISOString().slice(0, 7), gross, workedAtLeastHalf: !low.includes(i) };
  });

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: "P-01",
    title: "Pracownica, mały płatnik, 12 miesięcy wynagrodzeń (Z-3)",
    description: "Wniosek o urlop macierzyński przekazany do ZUS przez pracodawcę (8 osób) wraz z Z-3.",
    extracted: base({
      documents: [
        { kind: "Z-3", summary: "Zaświadczenie płatnika: wynagrodzenia 2025-07…2026-06 po 7 000 zł brutto" },
        { kind: "akt_urodzenia", summary: "Odpis skrócony aktu urodzenia dziecka" },
      ],
      insuranceFrom: "2023-02-01",
      payerInsuredCount: 8,
      monthlyIncomes: months("2025-07", 12, 7000),
      childBirthDate: "2026-07-14",
      zusDecision: { outcome: "granted", monthlyAmount: 6040.3, reason: "Przyznano zasiłek macierzyński za okres urlopu macierzyńskiego (100%)." },
    }),
  },
  {
    id: "P-02",
    title: "Pracownica z miesiącem choroby w podstawie (Z-3) i premią kwartalną",
    description: "Jeden miesiąc przepracowany w mniej niż połowie — wyłączony z podstawy. Premie kwartalne po 1 500 zł.",
    extracted: base({
      documents: [{ kind: "Z-3", summary: "Wynagrodzenia 12 miesięcy, w 2026-01 przepracowano < ½ czasu" }, { kind: "ZAM", summary: "Wniosek 81,5% złożony 10 dni po porodzie" }],
      insuranceFrom: "2019-05-01",
      payerInsuredCount: 15,
      monthlyIncomes: months("2025-06", 12, 8200, [7]),
      quarterlyBonuses: [1500, 1500, 1500, 1500],
      childBirthDate: "2026-06-20",
      averaged815: true,
      zusDecision: { outcome: "granted", monthlyAmount: 6118.39, reason: "Przyznano zasiłek w wysokości 81,5% podstawy za okres macierzyńskiego i rodzicielskiego." },
    }),
  },
  {
    id: "J-01",
    title: "Działalność gospodarcza, dobrowolne chorobowe (ZAM + poświadczenie)",
    description: "Osoba prowadząca JDG od 2021 r., podstawa składki 5 652 zł, brak zaległości.",
    extracted: base({
      documents: [{ kind: "ZAM", summary: "Wniosek o zasiłek macierzyński" }, { kind: "poswiadczenie_ubezpieczenia", summary: "Dobrowolne chorobowe od 2021-03-01, podstawa 5 652 zł" }],
      insuranceTitle: "business",
      sicknessInsurance: "voluntary",
      insuranceFrom: "2021-03-01",
      declaredBases: Array(12).fill(5652),
      childBirthDate: "2026-05-02",
      contributionDebt: 0,
      zusDecision: { outcome: "granted", monthlyAmount: 4877.11, reason: "Przyznano zasiłek macierzyński (100%)." },
    }),
  },
  {
    id: "J-02",
    title: "Działalność — zaległość w składkach w dniu porodu",
    description: "Zaległość 214,60 zł na dzień porodu (powyżej 1% minimalnego wynagrodzenia).",
    extracted: base({
      documents: [{ kind: "ZAM", summary: "Wniosek o zasiłek macierzyński" }, { kind: "zrzut_systemu_zus", summary: "Saldo konta płatnika: zaległość 214,60 zł" }],
      insuranceTitle: "business",
      sicknessInsurance: "voluntary",
      insuranceFrom: "2022-01-01",
      declaredBases: Array(12).fill(5652),
      childBirthDate: "2026-04-11",
      contributionDebt: 214.6,
      zusDecision: { outcome: "denied", monthlyAmount: null, reason: "Zasiłek nie przysługuje do czasu spłaty zadłużenia przekraczającego 1% minimalnego wynagrodzenia." },
    }),
  },
  {
    id: "Z-01",
    title: "Umowa zlecenia bez dobrowolnego chorobowego",
    description: "Zleceniobiorczyni nie przystąpiła do dobrowolnego ubezpieczenia chorobowego.",
    extracted: base({
      documents: [{ kind: "ZAM", summary: "Wniosek o zasiłek macierzyński" }, { kind: "poswiadczenie_ubezpieczenia", summary: "Zlecenie od 2025-09-01 — brak ubezpieczenia chorobowego" }],
      insuranceTitle: "mandate",
      sicknessInsurance: "none",
      insuranceFrom: "2025-09-01",
      payerInsuredCount: 4,
      monthlyIncomes: months("2025-09", 9, 4500),
      childBirthDate: "2026-06-03",
      zusDecision: { outcome: "denied", monthlyAmount: null, reason: "W dniu porodu wnioskodawczyni nie podlegała ubezpieczeniu chorobowemu." },
    }),
  },
  {
    id: "P-03",
    title: "Umowa terminowa zakończona przed 3. miesiącem ciąży",
    description: "Umowa na czas określony skończyła się na długo przed porodem — brak przedłużenia z mocy prawa.",
    extracted: base({
      documents: [{ kind: "ZAM", summary: "Wniosek po porodzie" }, { kind: "zrzut_systemu_zus", summary: "Umowa o pracę 2025-03-01 – 2025-11-30" }],
      insuranceFrom: "2025-03-01",
      insuranceTo: "2025-11-30",
      payerInsuredCount: 40,
      monthlyIncomes: months("2025-03", 9, 5500),
      childBirthDate: "2026-08-25",
      dueDate: "2026-08-25",
      zusDecision: { outcome: "denied", monthlyAmount: null, reason: "Ubezpieczenie ustało przed porodem; nie zachodzą przesłanki z art. 30 ustawy." },
    }),
  },
  {
    id: "O-01",
    title: "Tata — urlop ojcowski (dawny ZAO)",
    description: "Pracownik, duży płatnik; podstawa z decyzji 7 766,10 zł.",
    extracted: base({
      documents: [{ kind: "ZAO", summary: "Wniosek o zasiłek za okres urlopu ojcowskiego (formularz sprzed 24.10.2026)" }],
      insured: { role: "father", firstName: null, lastName: null },
      insuranceFrom: "2018-01-01",
      payerInsuredCount: 230,
      benefitBasis: 7766.1,
      childBirthDate: "2026-09-02",
      requestedBenefit: "paternity",
      zusDecision: { outcome: "granted", monthlyAmount: 7766.1, reason: "Zasiłek za okres urlopu ojcowskiego (100%)." },
      notes: ["Formularz ZAO zlikwidowany 24.10.2026 — obecnie ZAM."],
    }),
  },
];

export const findSample = (id: string) => SAMPLE_CASES.find((c) => c.id === id) ?? null;
