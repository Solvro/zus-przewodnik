import { addDays, addMonths, todayIso } from "@/engine/dates";
import type { ParentInput, Scenario } from "@/engine/types";

/**
 * Persony demonstracyjne — fikcyjne osoby z danymi „jak z systemów ZUS”.
 * Daty liczone względem dzisiaj, żeby demo było zawsze aktualne.
 */

export interface InsuranceRecord {
  title: "Umowa o pracę" | "Umowa zlecenia" | "Pozarolnicza działalność" | "Brak tytułu";
  payerName: string;
  payerNip: string;
  payerInsuredCount: number | null;
  from: string;
  to: string | null;
  sickness: "obowiązkowe" | "dobrowolne" | "brak";
  contributionBase: number; // ostatnia miesięczna podstawa składek
}

export interface EzlaRecord {
  series: string;
  from: string;
  to: string;
  code: string; // np. "B"
  doctor: string;
  status: "przekazane" | "skorygowane";
}

export interface PersonaZusData {
  insurance: InsuranceRecord[];
  ezla: EzlaRecord[];
  debt: number; // zaległość na dziś (tylko JDG)
  messages: { id: string; date: string; from: string; subject: string; body: string; unread: boolean }[];
}

export interface Persona {
  id: string;
  firstName: string;
  lastName: string;
  peselMasked: string;
  headline: string;
  story: string;
  tags: string[];
  zus: PersonaZusData;
  scenario: Scenario;
}

const employee = (gross: number, extra: Partial<ParentInput> = {}): ParentInput => ({
  title: "employment",
  voluntarySickness: false,
  insuranceStart: "2021-03-01",
  insuranceEnd: null,
  payerInsuredCount: 120,
  fullTime: true,
  basis: { mode: "gross", monthlyGross: gross },
  contributionDebt: 0,
  basisRaisedDuringPregnancy: false,
  ...extra,
});

const welcome = (date: string) => ({
  id: "m-welcome",
  date,
  from: "ZUS",
  subject: "Witamy w eZUS",
  body: "Na Twoim profilu możesz sprawdzić zwolnienia lekarskie, składki i złożyć wniosek o zasiłek.",
  unread: false,
});

export function buildPersonas(today = todayIso()): Persona[] {
  const d = (n: number) => addDays(today, n);
  return [
    {
      id: "anna",
      firstName: "Anna",
      lastName: "Kowalska",
      peselMasked: "92******48",
      headline: "Etat w dużej firmie, pierwsze dziecko",
      story: "Pracuje na umowę o pracę w firmie zatrudniającej 120 osób. Partner Marek pracuje w małej firmie. Rozważają wariant 81,5% i podział urlopu.",
      tags: ["umowa o pracę", "duży płatnik", "81,5%", "podział z tatą"],
      zus: {
        insurance: [
          { title: "Umowa o pracę", payerName: "Nordtech Solutions Sp. z o.o.", payerNip: "5272******", payerInsuredCount: 120, from: "2021-03-01", to: null, sickness: "obowiązkowe", contributionBase: 8500 },
        ],
        ezla: [],
        debt: 0,
        messages: [welcome(d(-400))],
      },
      scenario: {
        event: "birth",
        dueDate: d(45),
        birthDate: d(45),
        childrenCount: 1,
        mother: employee(8500),
        father: employee(9200, { insuranceStart: "2019-09-01", payerInsuredCount: 14 }),
        plan: { averaged: true, prenatalWeeks: 0, parentalFatherWeeks: 9, parentalConcurrent: false, paternity: true, supplementaryBy: "mother" },
      },
    },
    {
      id: "kasia",
      firstName: "Katarzyna",
      lastName: "Nowak",
      peselMasked: "90******22",
      headline: "Własna działalność, zaległość w składkach",
      story: "Graficzka na JDG, opłaca dobrowolne chorobowe od standardowej podstawy. Ma niewielką zaległość — sprawdźmy, czy blokuje zasiłek.",
      tags: ["JDG", "dobrowolne chorobowe", "zaległość > 1%"],
      zus: {
        insurance: [
          { title: "Pozarolnicza działalność", payerName: "Katarzyna Nowak Studio", payerNip: "7311******", payerInsuredCount: null, from: "2020-01-01", to: null, sickness: "dobrowolne", contributionBase: 5652 },
        ],
        ezla: [],
        debt: 126.4,
        messages: [
          welcome(d(-700)),
          { id: "m-debt", date: d(-12), from: "ZUS — Oddział w Łodzi", subject: "Informacja o stanie konta płatnika", body: "Na Twoim koncie jest zaległość w składkach na ubezpieczenia społeczne: 126,40 zł. Spłata przed dniem powstania prawa do zasiłku pozwoli go wypłacić.", unread: true },
        ],
      },
      scenario: {
        event: "birth",
        dueDate: d(60),
        birthDate: d(60),
        childrenCount: 1,
        mother: {
          title: "business",
          voluntarySickness: true,
          insuranceStart: "2020-01-01",
          insuranceEnd: null,
          fullTime: true,
          basis: { mode: "declared", monthlyBases: Array(12).fill(5652), minBaseType: "standard" },
          contributionDebt: 126.4,
          basisRaisedDuringPregnancy: false,
        },
        plan: { averaged: false, prenatalWeeks: 2, parentalFatherWeeks: 0, parentalConcurrent: false, paternity: false, supplementaryBy: "mother" },
      },
    },
    {
      id: "ola",
      firstName: "Aleksandra",
      lastName: "Wiśniewska",
      peselMasked: "98******06",
      headline: "Umowa zlecenia u małego zleceniodawcy",
      story: "Pracuje na zleceniu w kawiarni (8 osób). Opłaca dobrowolne chorobowe. Dziecko urodziło się 10 dni temu — zostało 11 dni na wniosek o 81,5%.",
      tags: ["zlecenie", "mały płatnik", "termin 21 dni"],
      zus: {
        insurance: [
          { title: "Umowa zlecenia", payerName: "Kawiarnia Ziarno s.c.", payerNip: "6762******", payerInsuredCount: 8, from: "2024-05-01", to: null, sickness: "dobrowolne", contributionBase: 4806 },
        ],
        ezla: [],
        debt: 0,
        messages: [welcome(d(-300))],
      },
      scenario: {
        event: "birth",
        birthDate: d(-10),
        dueDate: d(-6),
        childrenCount: 1,
        mother: {
          title: "mandate",
          voluntarySickness: true,
          insuranceStart: "2024-05-01",
          insuranceEnd: null,
          payerInsuredCount: 8,
          fullTime: true,
          basis: { mode: "gross", monthlyGross: 4806 },
          contributionDebt: 0,
          basisRaisedDuringPregnancy: false,
        },
        plan: { averaged: false, prenatalWeeks: 0, parentalFatherWeeks: 0, parentalConcurrent: false, paternity: true, supplementaryBy: "mother" },
      },
    },
    {
      id: "ewa",
      firstName: "Ewa",
      lastName: "Zielińska",
      peselMasked: "94******81",
      headline: "Bliźnięta urodzone w 30. tygodniu",
      story: "Bliźnięta urodziły się przedwcześnie (30. tc, 1 200 g) i spędziły 40 dni na oddziale. Przysługuje dłuższy macierzyński i uzupełniający urlop.",
      tags: ["bliźnięta", "wcześniak", "uzupełniający urlop"],
      zus: {
        insurance: [
          { title: "Umowa o pracę", payerName: "Szpital Miejski nr 2", payerNip: "9512******", payerInsuredCount: 640, from: "2018-10-01", to: null, sickness: "obowiązkowe", contributionBase: 7300 },
        ],
        ezla: [{ series: "ZY 4410921", from: d(-50), to: d(-21), code: "B", doctor: "lek. M. Rogalska", status: "przekazane" }],
        debt: 0,
        messages: [welcome(d(-900))],
      },
      scenario: {
        event: "birth",
        birthDate: d(-20),
        dueDate: d(50),
        childrenCount: 2,
        premature: { gestationWeek: 30, birthWeightG: 1200, hospitalDays: 40 },
        mother: employee(7300, { insuranceStart: "2018-10-01", payerInsuredCount: 640 }),
        father: employee(8100, { insuranceStart: "2016-02-01", payerInsuredCount: 35 }),
        sickLeaves: [{ from: d(-50), to: d(-21), pregnancyCodeB: true }],
        plan: { averaged: false, prenatalWeeks: 0, parentalFatherWeeks: 9, parentalConcurrent: false, paternity: true, supplementaryBy: "mother" },
      },
    },
    {
      id: "piotr",
      firstName: "Piotr",
      lastName: "Lewandowski",
      peselMasked: "89******17",
      headline: "Tata na etacie, mama bez ubezpieczenia",
      story: "Partnerka Piotra studiuje i nie ma ubezpieczenia chorobowego. Piotr może wziąć ojcowski i rodzicielski (bez 9 tygodni przypisanych mamie).",
      tags: ["tata", "mama nieubezpieczona", "rodzicielski taty"],
      zus: {
        insurance: [
          { title: "Umowa o pracę", payerName: "Trasa Plus Sp. z o.o.", payerNip: "8992******", payerInsuredCount: 310, from: "2017-06-01", to: null, sickness: "obowiązkowe", contributionBase: 8800 },
        ],
        ezla: [],
        debt: 0,
        messages: [welcome(d(-200))],
      },
      scenario: {
        event: "birth",
        birthDate: d(20),
        dueDate: d(20),
        childrenCount: 1,
        mother: { title: "none", voluntarySickness: false, insuranceEnd: null, fullTime: true, contributionDebt: 0, basisRaisedDuringPregnancy: false },
        father: employee(8800, { insuranceStart: "2017-06-01", payerInsuredCount: 310 }),
        plan: { averaged: false, prenatalWeeks: 0, parentalFatherWeeks: 32, parentalConcurrent: false, paternity: true, supplementaryBy: "father" },
      },
    },
    {
      id: "joanna",
      firstName: "Joanna",
      lastName: "Dąbrowska",
      peselMasked: "86******54",
      headline: "Adopcja trzylatka",
      story: "Joanna i jej mąż przyjmują na wychowanie 3-letniego chłopca i wystąpili do sądu o przysposobienie.",
      tags: ["adopcja", "na warunkach macierzyńskiego"],
      zus: {
        insurance: [
          { title: "Umowa o pracę", payerName: "Urząd Gminy Stare Pole", payerNip: "5782******", payerInsuredCount: 45, from: "2015-04-01", to: null, sickness: "obowiązkowe", contributionBase: 6900 },
        ],
        ezla: [],
        debt: 0,
        messages: [welcome(d(-1000))],
      },
      scenario: {
        event: "adoption",
        placementDate: d(14),
        childBirthDate: addMonths(today, -38),
        childrenCount: 1,
        mother: employee(6900, { insuranceStart: "2015-04-01", payerInsuredCount: 45 }),
        father: employee(7600, { insuranceStart: "2012-01-01", payerInsuredCount: 9 }),
        plan: { averaged: true, prenatalWeeks: 0, parentalFatherWeeks: 9, parentalConcurrent: false, paternity: true, supplementaryBy: "mother" },
      },
    },
    {
      id: "magda",
      firstName: "Magdalena",
      lastName: "Wójcik",
      peselMasked: "93******30",
      headline: "Martwe urodzenie",
      story: "Ścieżka wrażliwa: co przysługuje po stracie dziecka, jakie dokumenty są potrzebne i gdzie szukać wsparcia.",
      tags: ["strata dziecka", "ścieżka wrażliwa"],
      zus: {
        insurance: [
          { title: "Umowa o pracę", payerName: "Biuro Rachunkowe Bilans", payerNip: "6342******", payerInsuredCount: 11, from: "2019-01-01", to: null, sickness: "obowiązkowe", contributionBase: 6200 },
        ],
        ezla: [],
        debt: 0,
        messages: [welcome(d(-800))],
      },
      scenario: {
        event: "birth",
        birthDate: d(-5),
        dueDate: d(30),
        childrenCount: 1,
        loss: { type: "stillbirth", survivingChildren: 0 },
        mother: employee(6200, { insuranceStart: "2019-01-01", payerInsuredCount: 11 }),
        plan: { averaged: false, prenatalWeeks: 0, parentalFatherWeeks: 0, parentalConcurrent: false, paternity: false, supplementaryBy: "mother" },
      },
    },
    {
      id: "zofia",
      firstName: "Zofia",
      lastName: "Kamińska",
      peselMasked: "91******63",
      headline: "Powrót na ½ etatu w trakcie rodzicielskiego",
      story: "Chce wrócić do pracy na pół etatu po 6 miesiącach i łączyć to z urlopem rodzicielskim przez 16 tygodni.",
      tags: ["łączenie z pracą", "½ etatu", "wydłużenie urlopu"],
      zus: {
        insurance: [
          { title: "Umowa o pracę", payerName: "Finanse Rodzinne Sp. z o.o.", payerNip: "7542******", payerInsuredCount: 210, from: "2016-09-01", to: null, sickness: "obowiązkowe", contributionBase: 10400 },
        ],
        ezla: [],
        debt: 0,
        messages: [welcome(d(-600))],
      },
      scenario: {
        event: "birth",
        birthDate: d(-30),
        dueDate: d(-28),
        childrenCount: 1,
        mother: employee(10400, { insuranceStart: "2016-09-01", payerInsuredCount: 210 }),
        plan: { averaged: false, prenatalWeeks: 0, parentalFatherWeeks: 0, parentalConcurrent: false, paternity: true, supplementaryBy: "mother", partTime: { parent: "mother", fraction: 0.5, weeks: 16 } },
      },
    },
    {
      id: "beata",
      firstName: "Beata",
      lastName: "Szymańska",
      peselMasked: "97******19",
      headline: "Umowa na czas określony kończy się w ciąży",
      story: "Umowa kończy się w 5. miesiącu ciąży. Z mocy prawa przedłuży się do dnia porodu — i zachowa prawo do zasiłku.",
      tags: ["umowa terminowa", "przedłużenie do porodu", "ochrona KP"],
      zus: {
        insurance: [
          { title: "Umowa o pracę", payerName: "Sklepy Pod Lipą Sp. z o.o.", payerNip: "6252******", payerInsuredCount: 85, from: "2025-02-01", to: d(30), sickness: "obowiązkowe", contributionBase: 5200 },
        ],
        ezla: [],
        debt: 0,
        messages: [welcome(d(-250))],
      },
      scenario: {
        event: "pregnancy",
        dueDate: d(100),
        childrenCount: 1,
        mother: employee(5200, { insuranceStart: "2025-02-01", insuranceEnd: d(30), contractType: "fixed", payerInsuredCount: 85 }),
        plan: { averaged: false, prenatalWeeks: 0, parentalFatherWeeks: 0, parentalConcurrent: false, paternity: true, supplementaryBy: "mother" },
      },
    },
    {
      id: "karolina",
      firstName: "Karolina",
      lastName: "Woźniak",
      peselMasked: "95******77",
      headline: "Ciąża i zwolnienia z kodem B",
      story: "Od kilku tygodni na zwolnieniu z kodem B. Pracuje w małej firmie — zasiłek chorobowy wypłaci ZUS.",
      tags: ["ciąża", "e-ZLA kod B", "mały płatnik"],
      zus: {
        insurance: [
          { title: "Umowa o pracę", payerName: "Pracownia Okien Lux", payerNip: "6431******", payerInsuredCount: 6, from: "2023-04-01", to: null, sickness: "obowiązkowe", contributionBase: 6100 },
        ],
        ezla: [
          { series: "ZY 7712040", from: d(-45), to: d(-16), code: "B", doctor: "lek. A. Malinowska", status: "przekazane" },
          { series: "ZY 7712988", from: d(-15), to: d(14), code: "B", doctor: "lek. A. Malinowska", status: "przekazane" },
        ],
        debt: 0,
        messages: [
          welcome(d(-500)),
          { id: "m-ezla", date: d(-15), from: "ZUS", subject: "Nowe zaświadczenie lekarskie", body: "Na Twój profil wpłynęło zaświadczenie lekarskie ZY 7712988 (kod B) na okres do " + d(14) + ".", unread: true },
        ],
      },
      scenario: {
        event: "pregnancy",
        dueDate: d(75),
        childrenCount: 1,
        mother: employee(6100, { insuranceStart: "2023-04-01", payerInsuredCount: 6 }),
        sickLeaves: [
          { from: d(-45), to: d(-16), pregnancyCodeB: true },
          { from: d(-15), to: d(14), pregnancyCodeB: true },
        ],
        plan: { averaged: false, prenatalWeeks: 0, parentalFatherWeeks: 0, parentalConcurrent: false, paternity: true, supplementaryBy: "mother" },
      },
    },
  ];
}

export function findPersona(id: string, today?: string) {
  return buildPersonas(today).find((p) => p.id === id) ?? null;
}
