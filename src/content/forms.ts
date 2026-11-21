import type { CalculationResult, Scenario, Segment } from "@/engine/types";

/**
 * Wzory wniosków (S6). Wnioski o urlopy zaprojektowane wg rozporządzenia MRPiPS z 11.03.2025
 * (Dz.U. 2025 poz. 322) — każdy wzór zawiera elementy wymagane przez wskazany paragraf.
 * Wniosek ZAM odwzorowuje zakres danych formularza ZUS (wzór na zus.pl).
 */

export interface FormCtx {
  s: Scenario;
  r?: CalculationResult;
  user?: { firstName: string; lastName: string } | null;
}

export type FieldType = "text" | "date" | "number" | "select" | "textarea";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  hint?: string;
  prefill?: (c: FormCtx) => string;
}

export interface FormDef {
  code: string;
  title: string;
  short: string;
  to: "employer" | "zus" | "payer-or-zus";
  who: "mother" | "father" | "any";
  legal: string;
  deadline?: string;
  fields: FormField[];
  statements: string[];
  attachments: string[];
  /** Czy wniosek pasuje do scenariusza (rekomendacja na liście). */
  relevant: (c: FormCtx) => boolean;
}

const seg = (c: FormCtx, kinds: Segment["kind"][], parent?: "mother" | "father") =>
  c.r?.segments.filter((x) => kinds.includes(x.kind) && (!parent || x.parent === parent)) ?? [];
const first = (c: FormCtx, kinds: Segment["kind"][], parent?: "mother" | "father") => seg(c, kinds, parent)[0];
const isEmp = (c: FormCtx, who: "mother" | "father") => (who === "mother" ? c.s.mother : c.s.father)?.title === "employment";
const fullName = (c: FormCtx) => (c.user ? `${c.user.firstName} ${c.user.lastName}` : "");
const childDate = (c: FormCtx) => c.s.birthDate ?? c.s.childBirthDate ?? c.s.dueDate ?? "";

const NAME: FormField = { id: "name", label: "Imię i nazwisko pracownika", type: "text", required: true, prefill: fullName };
const CHILD: FormField = { id: "child", label: "Imię i nazwisko dziecka (dzieci)", type: "text", required: true };
const CHILD_BIRTH: FormField = { id: "childBirth", label: "Data urodzenia dziecka", type: "date", required: true, prefill: childDate };
const EMPLOYER: FormField = { id: "employer", label: "Pracodawca (nazwa, adres)", type: "text", required: true };

export const FORMS: FormDef[] = [
  {
    code: "URL-PRZED",
    title: "Wniosek o część urlopu macierzyńskiego przed przewidywaną datą porodu",
    short: "Urlop macierzyński przed porodem",
    to: "employer",
    who: "mother",
    legal: "Kodeks pracy art. 180 § 2; rozporządzenie Dz.U. 2025 poz. 322 § 2",
    deadline: "Najpóźniej 14 dni przed planowanym rozpoczęciem",
    fields: [
      EMPLOYER,
      NAME,
      { id: "from", label: "Data, od której ma być udzielona część urlopu", type: "date", required: true, prefill: (c) => first(c, ["prenatal"])?.start ?? "" },
      { id: "dueDate", label: "Przewidywana data porodu (z zaświadczenia lekarskiego)", type: "date", required: true, prefill: (c) => c.s.dueDate ?? "" },
    ],
    statements: [],
    attachments: ["Kopia zaświadczenia lekarskiego (zwykły druk) określającego przewidywaną datę porodu"],
    relevant: (c) => isEmp(c, "mother") && (c.s.plan?.prenatalWeeks ?? 0) > 0,
  },
  {
    code: "URL-ROD",
    title: "Wniosek o udzielenie urlopu rodzicielskiego",
    short: "Urlop rodzicielski",
    to: "employer",
    who: "any",
    legal: "Kodeks pracy art. 182¹a, 182¹d; rozporządzenie Dz.U. 2025 poz. 322 § 15",
    deadline: "Co najmniej 21 dni przed rozpoczęciem urlopu",
    fields: [
      EMPLOYER,
      NAME,
      CHILD,
      CHILD_BIRTH,
      { id: "used", label: "Dotychczas wykorzystany urlop rodzicielski / zasiłek za ten okres (okresy) i liczba części", type: "textarea", required: true, prefill: () => "Nie korzystałam/em dotąd z urlopu rodzicielskiego (0 części)." },
      { id: "from", label: "Urlop od", type: "date", required: true, prefill: (c) => first(c, ["parental", "parental_exclusive"], "mother")?.start ?? first(c, ["parental", "parental_exclusive"])?.start ?? "" },
      { id: "to", label: "Urlop do", type: "date", required: true, prefill: (c) => { const s = seg(c, ["parental", "parental_exclusive"], "mother"); const all = s.length ? s : seg(c, ["parental", "parental_exclusive"]); return all.at(-1)?.end ?? ""; } },
      { id: "otherParent", label: "Oświadczenie o drugim rodzicu", type: "select", required: true, options: ["Drugi z rodziców nie zamierza korzystać z urlopu rodzicielskiego w okresie objętym wnioskiem", "Drugi z rodziców zamierza korzystać z urlopu rodzicielskiego w części okresu (wskazanej w uwagach)"] },
      { id: "notes", label: "Uwagi", type: "textarea" },
    ],
    statements: [],
    attachments: ["Odpis skrócony aktu urodzenia dziecka (lub jego kopia)", "Kopia zaświadczenia „Za życiem” — jeśli wnioskujesz o wydłużony urlop"],
    relevant: (c) => (isEmp(c, "mother") && seg(c, ["parental"], "mother").length > 0) || (isEmp(c, "father") && seg(c, ["parental", "parental_exclusive"], "father").length > 0),
  },
  {
    code: "URL-OJC",
    title: "Wniosek o udzielenie urlopu ojcowskiego",
    short: "Urlop ojcowski",
    to: "employer",
    who: "father",
    legal: "Kodeks pracy art. 182³; rozporządzenie Dz.U. 2025 poz. 322 § 17",
    deadline: "Co najmniej 7 dni przed rozpoczęciem; do 12. miesiąca życia dziecka",
    fields: [
      EMPLOYER,
      NAME,
      CHILD,
      CHILD_BIRTH,
      { id: "from", label: "Urlop od", type: "date", required: true, prefill: (c) => first(c, ["paternity"])?.start ?? "" },
      { id: "to", label: "Urlop do", type: "date", required: true, prefill: (c) => first(c, ["paternity"])?.end ?? "" },
      { id: "usedBefore", label: "Czy korzystałeś już z urlopu ojcowskiego (lub jego części) na to dziecko?", type: "select", required: true, options: ["Nie", "Tak — w wymiarze wskazanym w uwagach"] },
    ],
    statements: [],
    attachments: ["Odpis skrócony aktu urodzenia dziecka (lub kopia)", "Przy przysposobieniu — kopia prawomocnego postanowienia sądu"],
    relevant: (c) => isEmp(c, "father") && seg(c, ["paternity"]).length > 0,
  },
  {
    code: "URL-REZ",
    title: "Wniosek o rezygnację z pozostałej części urlopu macierzyńskiego i powrót do pracy",
    short: "Rezygnacja mamy z części macierzyńskiego",
    to: "employer",
    who: "mother",
    legal: "Kodeks pracy art. 180 § 8; rozporządzenie Dz.U. 2025 poz. 322 § 3",
    deadline: "Najpóźniej 7 dni przed powrotem do pracy",
    fields: [EMPLOYER, NAME, { id: "return", label: "Termin powrotu do pracy", type: "date", required: true, prefill: (c) => first(c, ["maternity_transfer"])?.start ?? "" }],
    statements: [],
    attachments: ["Kopia wniosku ojca dziecka o udzielenie pozostałej części urlopu macierzyńskiego (albo oświadczenia ubezpieczonego ojca o przerwaniu działalności zarobkowej)"],
    relevant: (c) => isEmp(c, "mother") && seg(c, ["maternity_transfer"]).length > 0,
  },
  {
    code: "URL-MAC-OJC",
    title: "Wniosek ojca o udzielenie pozostałej części urlopu macierzyńskiego",
    short: "Tata przejmuje część macierzyńskiego",
    to: "employer",
    who: "father",
    legal: "Kodeks pracy art. 180 § 9; rozporządzenie Dz.U. 2025 poz. 322 § 5",
    fields: [
      EMPLOYER,
      NAME,
      CHILD,
      CHILD_BIRTH,
      { id: "prenatalUsed", label: "Okres urlopu / zasiłku macierzyńskiego wykorzystany przez matkę przed porodem", type: "text", prefill: (c) => ((c.s.plan?.prenatalWeeks ?? 0) > 0 ? `${c.s.plan?.prenatalWeeks} tyg.` : "brak") },
      { id: "from", label: "Urlop od", type: "date", required: true, prefill: (c) => first(c, ["maternity_transfer"])?.start ?? "" },
      { id: "to", label: "Urlop do", type: "date", required: true, prefill: (c) => first(c, ["maternity_transfer"])?.end ?? "" },
    ],
    statements: [],
    attachments: ["Odpis skrócony aktu urodzenia dziecka (lub kopia)", "Oświadczenie matki o zamiarze rezygnacji z pozostałej części urlopu macierzyńskiego / zasiłku"],
    relevant: (c) => isEmp(c, "father") && seg(c, ["maternity_transfer"]).length > 0,
  },
  {
    code: "URL-UZU",
    title: "Wniosek o udzielenie uzupełniającego urlopu macierzyńskiego",
    short: "Uzupełniający urlop macierzyński",
    to: "employer",
    who: "any",
    legal: "Kodeks pracy art. 180²; rozporządzenie Dz.U. 2025 poz. 322 § 14",
    deadline: "Najpóźniej 21 dni przed zakończeniem urlopu macierzyńskiego",
    fields: [
      EMPLOYER,
      NAME,
      { id: "maternityEnd", label: "Termin zakończenia urlopu macierzyńskiego", type: "date", required: true, prefill: (c) => { const m = seg(c, ["maternity", "maternity_transfer"]); return m.at(-1)?.end ?? ""; } },
      { id: "from", label: "Uzupełniający urlop od", type: "date", required: true, prefill: (c) => first(c, ["supplementary"])?.start ?? "" },
      { id: "to", label: "Uzupełniający urlop do", type: "date", required: true, prefill: (c) => first(c, ["supplementary"])?.end ?? "" },
    ],
    statements: ["Drugi z rodziców nie zamierza korzystać z uzupełniającego urlopu macierzyńskiego ani z zasiłku macierzyńskiego za okres odpowiadający temu urlopowi."],
    attachments: ["Zaświadczenie ze szpitala: okres pobytu dziecka oraz tydzień ciąży / masa urodzeniowa"],
    relevant: (c) => seg(c, ["supplementary"]).some((x) => isEmp(c, x.parent)),
  },
  {
    code: "URL-PRACA",
    title: "Wniosek o łączenie urlopu rodzicielskiego z pracą u pracodawcy",
    short: "Praca na część etatu w trakcie rodzicielskiego",
    to: "employer",
    who: "any",
    legal: "Kodeks pracy art. 182¹e–182¹f; rozporządzenie Dz.U. 2025 poz. 322 § 16",
    deadline: "Co najmniej 21 dni przed podjęciem pracy",
    fields: [
      EMPLOYER,
      NAME,
      { id: "fraction", label: "Wymiar czasu pracy", type: "select", required: true, options: ["1/2 etatu", "3/8 etatu", "1/4 etatu"], prefill: (c) => ({ 0.5: "1/2 etatu", 0.375: "3/8 etatu", 0.25: "1/4 etatu" } as Record<number, string>)[c.s.plan?.partTime?.fraction ?? 0.5] ?? "1/2 etatu" },
      { id: "from", label: "Łączenie od", type: "date", required: true, prefill: (c) => c.r?.segments.find((x) => x.workFraction > 0)?.start ?? "" },
      { id: "to", label: "Łączenie do", type: "date", required: true, prefill: (c) => c.r?.segments.filter((x) => x.workFraction > 0).at(-1)?.end ?? "" },
      { id: "extension", label: "Część urlopu powstała z wydłużenia — czy też łączysz ją z pracą?", type: "select", required: true, options: ["Nie zamierzam łączyć wydłużonej części z pracą", "Zamierzam łączyć wydłużoną część z pracą w wymiarze wskazanym w uwagach"] },
    ],
    statements: [],
    attachments: [],
    relevant: (c) => !!c.r?.segments.some((x) => x.workFraction > 0),
  },
  {
    code: "URL-PRZYSP",
    title: "Wniosek o urlop na warunkach urlopu macierzyńskiego",
    short: "Urlop na warunkach macierzyńskiego (adopcja / rodzina zastępcza)",
    to: "employer",
    who: "any",
    legal: "Kodeks pracy art. 183 § 6; rozporządzenie Dz.U. 2025 poz. 322 § 18",
    deadline: "W ciągu 7 dni od przyjęcia dziecka; urlop od maks. 21. dnia",
    fields: [
      EMPLOYER,
      NAME,
      CHILD,
      { id: "childBirth", label: "Data urodzenia dziecka", type: "date", required: true, prefill: (c) => c.s.childBirthDate ?? "" },
      { id: "placement", label: "Data przyjęcia dziecka na wychowanie", type: "date", required: true, prefill: (c) => c.s.placementDate ?? "" },
      { id: "from", label: "Urlop od", type: "date", required: true, prefill: (c) => first(c, ["adoption_maternity"])?.start ?? "" },
      { id: "to", label: "Urlop do", type: "date", required: true, prefill: (c) => first(c, ["adoption_maternity"])?.end ?? "" },
    ],
    statements: [],
    attachments: ["Zaświadczenie sądu o dacie wystąpienia o przysposobienie (z datą urodzenia dziecka) albo kopia orzeczenia o umieszczeniu w rodzinie zastępczej / umowy ze starostą", "Kopia decyzji o odroczeniu obowiązku szkolnego — jeśli dotyczy"],
    relevant: (c) => (c.s.event === "adoption" || c.s.event === "foster") && seg(c, ["adoption_maternity"]).some((x) => isEmp(c, x.parent)),
  },
  {
    code: "ZAM",
    title: "Wniosek o zasiłek macierzyński (ZAM)",
    short: "Wniosek o zasiłek macierzyński — ZAM",
    to: "payer-or-zus",
    who: "any",
    legal: "Ustawa zasiłkowa art. 29–31, 30a; rozporządzenie Dz.U. 2026 poz. 1316 (zakres dokumentów); wzór ZAM na zus.pl",
    deadline: "Wariant 81,5%: najpóźniej 21 dni po porodzie / przyjęciu dziecka",
    fields: [
      { id: "name", label: "Imię i nazwisko", type: "text", required: true, prefill: fullName },
      { id: "pesel", label: "PESEL", type: "text", required: true, hint: "W wdrożeniu uzupełniany automatycznie z mObywatela." },
      { id: "address", label: "Adres zamieszkania", type: "text", required: true },
      { id: "type", label: "Zasiłek za okres", type: "select", required: true, options: ["urlopu macierzyńskiego", "urlopu macierzyńskiego i rodzicielskiego w pełnym wymiarze (81,5%)", "urlopu na warunkach urlopu macierzyńskiego", "urlopu rodzicielskiego", "urlopu ojcowskiego"], prefill: (c) => (c.s.plan?.averaged ? "urlopu macierzyńskiego i rodzicielskiego w pełnym wymiarze (81,5%)" : c.s.event === "adoption" || c.s.event === "foster" ? "urlopu na warunkach urlopu macierzyńskiego" : "urlopu macierzyńskiego") },
      CHILD,
      { id: "childBirth", label: "Data urodzenia / przyjęcia dziecka", type: "date", required: true, prefill: (c) => c.s.birthDate ?? c.s.placementDate ?? "" },
      { id: "from", label: "Okres od", type: "date", required: true, prefill: (c) => c.r?.segments.find((x) => x.parent === "mother" && x.kind !== "sick_pay" && x.kind !== "sickness")?.start ?? "" },
      { id: "to", label: "Okres do", type: "date", required: true, prefill: (c) => c.r?.returnToWork.mother ?? "" },
      { id: "account", label: "Numer rachunku bankowego do wypłaty", type: "text", required: true, hint: "26 cyfr" },
    ],
    statements: [
      "Oświadczam, że dane we wniosku są zgodne z prawdą.",
      "Przyjmuję do wiadomości, że muszę poinformować ZUS/płatnika o okolicznościach mających wpływ na prawo do zasiłku.",
    ],
    attachments: ["Odpis skrócony aktu urodzenia (lub wniosek o pobranie go przez ZUS z rejestru)", "Inne dokumenty zależnie od sytuacji (np. „Za życiem”, zaświadczenie o martwym urodzeniu)"],
    relevant: (c) => c.s.mother.title === "mandate" || c.s.mother.title === "business" || c.s.father?.title === "mandate" || c.s.father?.title === "business",
  },
];

export const findForm = (code: string) => FORMS.find((f) => f.code === code) ?? null;
