import { addDays, addMonths, fmt } from "./dates";
import type { CoverageResult } from "./insurance";
import type { TimelineResult } from "./leave";
import type { LegalParams } from "./params";
import type { Deadline, DocumentItem, Parent, ParentInput, ScenarioParsed, Segment } from "./types";

interface DocCtx {
  s: ScenarioParsed;
  timeline: TimelineResult;
  segments: Segment[];
  coverage: { mother: CoverageResult; father?: CoverageResult };
  payer: Partial<Record<Parent, { who: "payer" | "zus" | "unknown" }>>;
  today: string;
  p: LegalParams;
}

function channelFor(parent: ParentInput, payerWho: "payer" | "zus" | "unknown"): {
  to: DocumentItem["submitTo"];
  channel: string;
} {
  if (parent.title === "employment")
    return { to: "employer", channel: "u pracodawcy (papierowo lub elektronicznie)" };
  if (parent.title === "mandate")
    return payerWho === "payer"
      ? { to: "payer", channel: "u zleceniodawcy" }
      : { to: "payer", channel: "u zleceniodawcy — przekaże do ZUS wraz z Z-3a" };
  return { to: "zus", channel: "do ZUS przez eZUS (najwygodniej) lub w placówce" };
}

/** Lista dokumentów: co, komu, kiedy — zależnie od formy zatrudnienia i sytuacji. */
export function buildDocuments({ s, timeline, segments, coverage, payer }: DocCtx): DocumentItem[] {
  const docs: DocumentItem[] = [];
  const event = timeline.eventDate;
  const isAdoption = s.event === "adoption" || s.event === "foster";
  const has = (parent: Parent, kinds: string[]) => segments.some((x) => x.parent === parent && kinds.includes(x.kind));

  for (const who of ["mother", "father"] as const) {
    const parent = who === "mother" ? s.mother : s.father;
    const cov = who === "mother" ? coverage.mother : coverage.father;
    if (!parent || !cov?.covered) continue;
    const pw = payer[who]?.who ?? "unknown";
    const ch = channelFor(parent, pw);
    const isEmployee = parent.title === "employment";

    const anyMaternity = has(who, [
      "prenatal",
      "maternity",
      "maternity_transfer",
      "adoption_maternity",
      "supplementary",
      "parental",
      "parental_exclusive",
      "paternity",
      "loss",
    ]);
    if (!anyMaternity) continue;

    if (isEmployee) {
      const leaves: string[] = [];
      if (has(who, ["prenatal", "maternity", "loss"])) leaves.push("macierzyński");
      if (has(who, ["maternity_transfer"])) leaves.push("część macierzyńskiego");
      if (has(who, ["adoption_maternity"])) leaves.push("na warunkach urlopu macierzyńskiego");
      if (has(who, ["supplementary"])) leaves.push("uzupełniający macierzyński");
      if (has(who, ["parental", "parental_exclusive"])) leaves.push("rodzicielski");
      if (has(who, ["paternity"])) leaves.push("ojcowski");
      docs.push({
        id: `${who}.leaveRequest`,
        parent: who,
        name: `Wniosek o urlop: ${leaves.join(", ")}`,
        submitTo: "employer",
        channel: ch.channel,
        when: "Patrz terminy — dla każdego urlopu inny",
        required: true,
        note:
          pw === "zus"
            ? "Pracodawca (≤ 20 ubezpieczonych) przekaże wniosek do ZUS wraz z zaświadczeniem płatnika Z-3."
            : "Pracodawca sam ustali i wypłaci zasiłek. Wniosek o urlop macierzyński i rodzicielski możesz złożyć jako jeden wniosek.",
      });
      if (pw !== "payer") {
        docs.push({
          id: `${who}.z3`,
          parent: who,
          name: "Zaświadczenie płatnika składek",
          code: "Z-3",
          submitTo: "none",
          channel: "wystawia pracodawca i przesyła do ZUS",
          when: "Po złożeniu wniosku",
          required: true,
        });
      }
    } else {
      docs.push({
        id: `${who}.zam`,
        parent: who,
        name: "Wniosek o zasiłek macierzyński (obejmuje też rodzicielski i ojcowski — dawne ZUR i ZAO)",
        code: "ZAM",
        submitTo: ch.to,
        channel: ch.channel,
        when: event ? `Po ${isAdoption ? "przyjęciu dziecka" : "porodzie"} (${fmt(event)}) lub przed urlopem przed porodem` : "Po porodzie",
        required: true,
      });
      if (parent.title === "mandate" && pw !== "payer") {
        docs.push({
          id: `${who}.z3a`,
          parent: who,
          name: "Zaświadczenie płatnika składek (zleceniobiorca)",
          code: "Z-3a",
          submitTo: "none",
          channel: "wystawia zleceniodawca i przesyła do ZUS",
          when: "Po złożeniu wniosku ZAM",
          required: true,
        });
      }
    }

    if (who === "mother" && !isAdoption && !s.loss) {
      docs.push({
        id: "mother.birthCert",
        parent: who,
        name: "Odpis skrócony aktu urodzenia dziecka",
        submitTo: isEmployee ? "employer" : ch.to,
        channel: "albo wniosek, by ZUS/pracodawca pobrał go z rejestru stanu cywilnego",
        when: "Po rejestracji urodzenia w USC",
        required: false,
        note: "Na Twój wniosek ZUS sam uzyska odpis z rejestru stanu cywilnego.",
      });
    }
    if (who === "mother" && s.plan.prenatalWeeks > 0) {
      docs.push({
        id: "mother.dueDateCert",
        parent: who,
        name: "Zaświadczenie lekarskie o przewidywanej dacie porodu",
        submitTo: ch.to === "zus" ? "zus" : ch.to,
        channel: ch.channel,
        when: "Razem z wnioskiem o macierzyński przed porodem",
        required: true,
      });
    }
    if (who === "mother" && s.plan.averaged) {
      docs.push({
        id: "mother.averaged",
        parent: who,
        name: "Wniosek o zasiłek za pełny okres macierzyńskiego i rodzicielskiego (81,5%)",
        submitTo: ch.to,
        channel: ch.channel,
        when: event ? `Najpóźniej ${fmt(addDays(event, 21))}` : "Do 21 dni po porodzie",
        required: true,
      });
    }
    if (has(who, ["maternity_transfer"])) {
      docs.push({
        id: "father.transfer",
        parent: who,
        name: "Wniosek o część urlopu macierzyńskiego + oświadczenie matki o rezygnacji z pozostałej części",
        submitTo: ch.to,
        channel: ch.channel,
        when: "Matka składa rezygnację najpóźniej 7 dni przed powrotem do pracy",
        required: true,
      });
    }
    if (has(who, ["supplementary"])) {
      docs.push(
        {
          id: `${who}.hospitalCert`,
          parent: who,
          name: "Zaświadczenie ze szpitala o pobycie dziecka (okres, tydzień ciąży lub masa urodzeniowa)",
          submitTo: ch.to,
          channel: ch.channel,
          when: "Razem z wnioskiem o uzupełniający urlop",
          required: true,
        },
        {
          id: `${who}.otherParentStatement`,
          parent: who,
          name: "Oświadczenie drugiego rodzica, że nie korzysta z uzupełniającego urlopu macierzyńskiego",
          submitTo: ch.to,
          channel: ch.channel,
          when: "Razem z wnioskiem",
          required: true,
        },
      );
    }
    if (s.zaZyciem && has(who, ["parental", "parental_exclusive"])) {
      docs.push({
        id: `${who}.zaZyciem`,
        parent: who,
        name: "Zaświadczenie „Za życiem” (lekarz specjalista)",
        submitTo: ch.to,
        channel: ch.channel,
        when: "Razem z wnioskiem o rodzicielski",
        required: true,
      });
    }
    if (isAdoption && has(who, ["adoption_maternity", "parental", "parental_exclusive"])) {
      docs.push({
        id: `${who}.court`,
        parent: who,
        name:
          s.event === "adoption"
            ? "Zaświadczenie sądu o wszczęciu postępowania o przysposobienie / potwierdzenie przyjęcia dziecka"
            : "Postanowienie sądu lub umowa o umieszczeniu dziecka w rodzinie zastępczej",
        submitTo: ch.to,
        channel: ch.channel,
        when: "Razem z wnioskiem",
        required: true,
      });
    }
    if (s.loss && who === "mother") {
      docs.push({
        id: "mother.lossCert",
        parent: who,
        name:
          s.loss.type === "stillbirth"
            ? "Odpis skrócony aktu urodzenia z adnotacją o martwym urodzeniu albo zaświadczenie o martwym urodzeniu (lekarz położnik/ginekolog lub położna)"
            : "Odpis skrócony aktu urodzenia oraz odpis aktu zgonu dziecka",
        submitTo: ch.to,
        channel: ch.channel,
        when: "Gdy będziesz gotowa — możesz poprosić ZUS o pobranie odpisu z rejestru",
        required: true,
      });
    }
    if (parent.title === "business") {
      docs.push({
        id: `${who}.debtCheck`,
        parent: who,
        name: "Sprawdzenie salda składek (brak zaległości > 1% minimalnego wynagrodzenia)",
        submitTo: "none",
        channel: "eZUS → Salda / zaświadczenie o niezaleganiu",
        when: "Przed porodem",
        required: false,
      });
    }
  }

  if (s.sickLeaves.length) {
    const m = s.mother;
    const pw = payer.mother?.who ?? "unknown";
    docs.push({
      id: "mother.ezla",
      parent: "mother",
      name: "Zwolnienie lekarskie e-ZLA z kodem „B”",
      code: "e-ZLA",
      submitTo: "none",
      channel: "lekarz wysyła automatycznie do ZUS i pracodawcy",
      when: "Przy każdej wizycie",
      required: true,
    });
    if (m.title === "employment" && pw !== "payer")
      docs.push({
        id: "mother.z3sick",
        parent: "mother",
        name: "Zaświadczenie płatnika (zasiłek chorobowy) — na kolejne okresy ZAS-12",
        code: "Z-3 / ZAS-12",
        submitTo: "none",
        channel: "wystawia pracodawca i przesyła do ZUS",
        when: "Po otrzymaniu e-ZLA",
        required: true,
      });
    if (m.title === "mandate" && pw !== "payer")
      docs.push({
        id: "mother.z3asick",
        parent: "mother",
        name: "Zaświadczenie płatnika (zleceniobiorca)",
        code: "Z-3a",
        submitTo: "none",
        channel: "wystawia zleceniodawca i przesyła do ZUS",
        when: "Po otrzymaniu e-ZLA",
        required: true,
      });
    if (m.title === "business")
      docs.push({
        id: "mother.zas53",
        parent: "mother",
        name: "Wniosek o zasiłek chorobowy",
        code: "ZAS-53",
        submitTo: "zus",
        channel: "eZUS",
        when: "Po otrzymaniu e-ZLA",
        required: true,
      });
  }
  return docs;
}

/** Terminy i przypomnienia (21/14/7 dni, ojcowski, 6 lat dziecka). */
export function buildDeadlines({ s, timeline, segments, today, p }: DocCtx): Deadline[] {
  const out: Deadline[] = [];
  const event = timeline.eventDate;
  const add = (d: Omit<Deadline, "passed">) => out.push({ ...d, passed: d.date < today });
  const isEmployee = (who: Parent) => (who === "mother" ? s.mother : s.father)?.title === "employment";

  for (const seg of segments) {
    if (seg.kind === "prenatal" && isEmployee("mother")) {
      add({
        id: `${seg.id}.req`,
        parent: "mother",
        date: addDays(seg.start, -p.prenatalRequestDaysBefore),
        title: "Wniosek o macierzyński przed porodem",
        description: `Najpóźniej ${p.prenatalRequestDaysBefore} dni przed planowanym rozpoczęciem (${fmt(seg.start)}), z zaświadczeniem o terminie porodu.`,
        kind: "must",
      });
    }
    if ((seg.kind === "parental" || seg.kind === "parental_exclusive") && isEmployee(seg.parent)) {
      const prev = segments.find(
        (x) => x.parent === seg.parent && x.kind.startsWith("parental") && addDays(x.end, 1) === seg.start,
      );
      if (!prev)
        add({
          id: `${seg.id}.req`,
          parent: seg.parent,
          date: addDays(seg.start, -p.parentalRequestDaysBefore),
          title: "Wniosek o urlop rodzicielski",
          description:
            seg.parent === "mother"
              ? `Co najmniej ${p.parentalRequestDaysBefore} dni przed rozpoczęciem (${fmt(seg.start)}) — albo od razu razem z wnioskiem o urlop macierzyński (jeden wniosek).`
              : `Co najmniej ${p.parentalRequestDaysBefore} dni przed rozpoczęciem (${fmt(seg.start)}).`,
          kind: "must",
        });
    }
    if (seg.kind === "supplementary") {
      add({
        id: `${seg.id}.req`,
        parent: seg.parent,
        date: addDays(seg.start, -p.supplementaryRequestDaysBefore),
        title: "Wniosek o uzupełniający urlop macierzyński",
        description: `Najpóźniej ${p.supplementaryRequestDaysBefore} dni przed końcem urlopu macierzyńskiego, z zaświadczeniem ze szpitala.`,
        kind: "must",
      });
    }
    if (seg.kind === "paternity" && isEmployee("father")) {
      add({
        id: `${seg.id}.req`,
        parent: "father",
        date: addDays(seg.start, -p.paternityRequestDaysBefore),
        title: "Wniosek o urlop ojcowski",
        description: `Co najmniej ${p.paternityRequestDaysBefore} dni przed rozpoczęciem (${fmt(seg.start)}).`,
        kind: "must",
      });
    }
    if (seg.kind === "maternity_transfer") {
      add({
        id: `${seg.id}.resign`,
        parent: "mother",
        date: addDays(seg.start, -p.returnToWorkNoticeDays),
        title: "Rezygnacja mamy z części macierzyńskiego",
        description: `Najpóźniej ${p.returnToWorkNoticeDays} dni przed powrotem do pracy (${fmt(seg.start)}).`,
        kind: "must",
      });
    }
    if (seg.workFraction > 0) {
      add({
        id: `${seg.id}.pt`,
        parent: seg.parent,
        date: addDays(seg.start, -p.partTimeRequestDaysBefore),
        title: "Wniosek o łączenie rodzicielskiego z pracą",
        description: `Co najmniej ${p.partTimeRequestDaysBefore} dni przed podjęciem pracy (${fmt(seg.start)}); określ, jak wykorzystasz wydłużenie.`,
        kind: "must",
      });
    }
  }

  if (event && s.plan.averaged && segments.some((x) => ["maternity", "adoption_maternity"].includes(x.kind))) {
    add({
      id: "averaged.req",
      parent: "mother",
      date: addDays(event, p.averagedRequestDays),
      title: "Ostatni dzień na wniosek o 81,5%",
      description: "Wniosek o zasiłek za pełny okres macierzyńskiego i rodzicielskiego.",
      kind: "must",
    });
  }
  if ((s.event === "adoption" || s.event === "foster") && event) {
    add({
      id: "adoption.req",
      parent: "mother",
      date: addDays(event, p.adoptionRequestDaysAfter),
      title: "Wniosek o urlop na warunkach urlopu macierzyńskiego",
      description: `W ciągu ${p.adoptionRequestDaysAfter} dni od przyjęcia dziecka; urlop musi się zacząć najpóźniej ${p.adoptionLeaveStartMaxDaysAfter} dni od przyjęcia.`,
      kind: "must",
    });
  }
  if (timeline.paternityDeadline && s.father) {
    add({
      id: "paternity.expires",
      parent: "father",
      date: timeline.paternityDeadline,
      title: "Wygasa prawo do urlopu ojcowskiego",
      description: "Do tego dnia trzeba wykorzystać 2 tygodnie urlopu ojcowskiego.",
      kind: "expires",
    });
  }
  if (timeline.parentalDeadline && timeline.weeks.parentalPool > 0) {
    add({
      id: "parental.expires",
      parent: "mother",
      date: timeline.parentalDeadline,
      title: "Ostateczny termin wykorzystania rodzicielskiego",
      description: "Urlop rodzicielski (do 5 części) trzeba wykorzystać do tego dnia.",
      kind: "expires",
    });
  }
  const lastSick = s.sickLeaves.map((x) => x.to).sort().at(-1);
  if (lastSick) {
    add({
      id: "sickness.claim",
      parent: "mother",
      date: addMonths(lastSick, p.sicknessClaimMonths),
      title: "Przedawnienie roszczenia o zasiłek chorobowy",
      description: `Roszczenie przedawnia się po ${p.sicknessClaimMonths} miesiącach od ostatniego dnia zwolnienia.`,
      kind: "expires",
    });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}
