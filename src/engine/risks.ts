import { addDays, diffDays, fmt } from "./dates";
import type { CoverageResult } from "./insurance";
import { pregnancyStart } from "./insurance";
import type { TimelineResult } from "./leave";
import { derived, type LegalParams } from "./params";
import type { ParentInput, Risk, ScenarioParsed } from "./types";

interface RiskCtx {
  s: ScenarioParsed;
  timeline: TimelineResult;
  coverage: { mother: CoverageResult; father?: CoverageResult };
  today: string;
  p: LegalParams;
}

/** Reguły ostrzeżeń: co może odebrać lub obniżyć świadczenie, oraz pozytywne informacje. */
export function assessRisks({ s, timeline, coverage, today, p }: RiskCtx): Risk[] {
  const risks: Risk[] = [];
  const event = timeline.eventDate;
  const isAdoption = s.event === "adoption" || s.event === "foster";
  const d = derived(p);

  const parents: Array<["mother" | "father", ParentInput | undefined, CoverageResult | undefined]> = [
    ["mother", s.mother, coverage.mother],
    ["father", s.father, coverage.father],
  ];

  for (const [who, parent, cov] of parents) {
    if (!parent || !cov) continue;
    const name = who === "mother" ? (isAdoption ? "Opiekun 1" : "Mama") : isAdoption ? "Opiekun 2" : "Tata";

    if (!cov.covered && parent.title !== "none") {
      risks.push({
        id: `${who}.notCovered`,
        level: "high",
        parent: who,
        title: `${name}: brak ubezpieczenia chorobowego w dniu ${isAdoption ? "przyjęcia dziecka" : "porodu"}`,
        description: cov.reasons.join(" "),
        action:
          parent.title === "mandate" || parent.title === "business"
            ? "Zgłoś się do dobrowolnego ubezpieczenia chorobowego (ZUS ZUA/ZZA) przed porodem — zasiłek macierzyński nie wymaga okresu wyczekiwania."
            : "Sprawdź daty umowy. Jeśli umowa skończy się przed porodem, rozważ kontynuację ubezpieczenia (np. nowa umowa, dobrowolne chorobowe przy JDG).",
        legal: [{ act: "ustawa zasiłkowa", ref: "art. 29 ust. 1" }],
      });
    }
    if (parent.title === "none" && who === "mother" && !isAdoption) {
      risks.push({
        id: "mother.noTitle",
        level: "info",
        parent: who,
        title: "Bez ubezpieczenia — sprawdź świadczenie rodzicielskie",
        description:
          "Zasiłek macierzyński z ZUS przysługuje tylko osobom z ubezpieczeniem chorobowym. Rodzicom bez prawa do zasiłku może przysługiwać świadczenie rodzicielskie (wypłaca gmina/MOPS, nie ZUS).",
        action: "Zapytaj w urzędzie gminy lub ośrodku pomocy społecznej o świadczenie rodzicielskie.",
        legal: [{ act: "ustawa zasiłkowa", ref: "art. 31 ust. 3a (kwota świadczenia rodzicielskiego)" }],
      });
    }
    if (cov.blockedByDebt) {
      risks.push({
        id: `${who}.debt`,
        level: "high",
        parent: who,
        title: `${name}: zaległość w składkach blokuje wypłatę`,
        description: `Zaległość przekracza ${d.debtThreshold.toFixed(2)} zł (1% minimalnego wynagrodzenia) na dzień powstania prawa do świadczenia.`,
        action: "Spłać zaległość (sprawdź saldo w eZUS) — po spłacie ZUS wypłaci świadczenie.",
        legal: [{ act: "Poradnik ZUS 2026", ref: "s. 25" }],
      });
    } else if (parent.title === "business" && parent.contributionDebt > 0) {
      risks.push({
        id: `${who}.debtSmall`,
        level: "medium",
        parent: who,
        title: `${name}: niewielka zaległość w składkach`,
        description: `Zaległość ${parent.contributionDebt.toFixed(2)} zł nie przekracza progu ${d.debtThreshold.toFixed(2)} zł, ale warto ją spłacić przed porodem.`,
        legal: [{ act: "Poradnik ZUS 2026", ref: "s. 25" }],
      });
    }
    if (cov.extendedToBirth) {
      risks.push({
        id: `${who}.extended`,
        level: "positive",
        parent: who,
        title: "Umowa przedłuży się do dnia porodu",
        description: cov.reasons.find((r) => r.includes("przedłuża")) ?? "",
        legal: [{ act: "Kodeks pracy", ref: "art. 177 § 3" }],
      });
    }
    if (parent.insuranceEnd && event && parent.insuranceEnd >= event && who === "mother") {
      const lastPlanned = timeline.segments.filter((x) => x.parent === who).map((x) => addDays(x.start, x.days - 1));
      const lastDay = lastPlanned.sort().at(-1);
      if (lastDay && parent.insuranceEnd < lastDay) {
        risks.push({
          id: `${who}.endsDuringLeave`,
          level: "info",
          parent: who,
          title: "Umowa kończy się w trakcie zasiłku",
          description: `Prawo do zasiłku macierzyńskiego nabyte w dniu porodu trwa także po ustaniu umowy (${fmt(parent.insuranceEnd)}), ale po jej ustaniu zasiłek wypłaci ZUS.`,
          legal: [{ act: "ustawa zasiłkowa", ref: "art. 29a, art. 61" }],
        });
      }
    }
    if (parent.insuranceStart && event && !isAdoption && s.dueDate) {
      const pregStart = pregnancyStart(s.dueDate);
      if (parent.insuranceStart >= pregStart) {
        risks.push({
          id: `${who}.recentStart`,
          level: "medium",
          parent: who,
          title: `${name}: ubezpieczenie rozpoczęte w trakcie ciąży`,
          description:
            "ZUS może sprawdzić, czy umowa lub działalność jest rzeczywiście wykonywana. Jeśli uzna ją za zawartą „dla pozoru”, wyda decyzję o niepodleganiu ubezpieczeniu — a wtedy zasiłek nie przysługuje.",
          action: "Zachowaj dowody wykonywania pracy: umowę, faktury, korespondencję, ewidencję czasu pracy, potwierdzenia przelewów.",
          legal: [{ act: "ustawa o sus", ref: "art. 68 ust. 1 pkt 1 lit. a, art. 83" }, { act: "Załącznik", ref: "PDF zadania, H pkt 1" }],
        });
      }
    }
    if (parent.basisRaisedDuringPregnancy) {
      risks.push({
        id: `${who}.basisRaised`,
        level: "medium",
        parent: who,
        title: `${name}: podwyższona podstawa składek w ciąży`,
        description:
          "Jeśli ZUS uzna, że podwyższenie służyło wyłącznie uzyskaniu wyższego zasiłku, może ustalić niższą podstawę wymiaru — zasiłek będzie niższy.",
        action: "Upewnij się, że podwyżka ma uzasadnienie (zakres obowiązków, przychody firmy) i dokumentację.",
        legal: [{ act: "Załącznik", ref: "PDF zadania, H pkt 2" }],
      });
    }
    if ((parent.title === "mandate" || parent.title === "business") && who === "mother") {
      risks.push({
        id: `${who}.noKpProtection`,
        level: "info",
        parent: who,
        title: "Brak ochrony z Kodeksu pracy",
        description:
          "Szczególna ochrona przed wypowiedzeniem i przedłużenie umowy do porodu dotyczą tylko umów o pracę. Przy zleceniu i działalności liczy się nieprzerwane ubezpieczenie chorobowe w dniu porodu.",
        legal: [{ act: "Kodeks pracy", ref: "art. 177" }],
      });
    }
    if (parent.title === "employment" && who === "mother" && !isAdoption) {
      risks.push({
        id: `${who}.kpProtection`,
        level: "positive",
        parent: who,
        title: "Jesteś pod ochroną Kodeksu pracy",
        description:
          "W ciąży i w trakcie urlopów rodzicielskich (od dnia złożenia wniosku) pracodawca nie może wypowiedzieć ani rozwiązać umowy, ani się do tego przygotowywać — z wyjątkiem rozwiązania z Twojej winy za zgodą związku zawodowego.",
        legal: [{ act: "Kodeks pracy", ref: "art. 177 § 1" }],
      });
    }
  }

  // Wariant 81,5%
  if (event && timeline.segments.some((x) => x.kind === "maternity" || x.kind === "adoption_maternity")) {
    const deadline = addDays(event, p.averagedRequestDays);
    if (s.plan.averaged) {
      risks.push({
        id: "averaged.rules",
        level: "info",
        title: "Wybrano wariant 81,5%",
        description:
          "Wniosek trzeba złożyć najpóźniej 21 dni po porodzie/przyjęciu dziecka. Jeśli w 1. roku życia dziecka nie wykorzystacie ani dnia rodzicielskiego, za rodzicielski będzie 70%, a za macierzyński przysługuje wyrównanie do 100% (na wniosek). 9 tygodni drugiego rodzica jest zawsze płatne 70%.",
        legal: [{ act: "ustawa zasiłkowa", ref: "art. 30a, art. 31 ust. 3, 3f, 3g, 4" }],
      });
      if (today > deadline) {
        risks.push({
          id: "averaged.late",
          level: "high",
          title: "Minął termin na wniosek o 81,5%",
          description: `Termin minął ${fmt(deadline)}. Zasiłek zostanie wypłacony w wariancie 100% + 70%.`,
          legal: [{ act: "ustawa zasiłkowa", ref: "art. 30a ust. 1" }],
        });
      }
    } else if (today <= deadline) {
      risks.push({
        id: "averaged.option",
        level: "info",
        title: "Możesz wybrać wariant 81,5%",
        description: `Do ${fmt(deadline)} możesz złożyć wniosek o zasiłek za cały okres (macierzyński + rodzicielski) w stałej wysokości 81,5%. Porównaj warianty w kalkulatorze.`,
        legal: [{ act: "ustawa zasiłkowa", ref: "art. 30a ust. 1" }],
      });
    }
  }

  // 9 tygodni drugiego rodzica
  if (
    s.father &&
    coverage.father?.covered &&
    timeline.weeks.parentalPool > 0 &&
    timeline.weeks.parentalUsedFather < p.parentalExclusiveWeeks
  ) {
    risks.push({
      id: "father.exclusiveUnused",
      level: "medium",
      parent: "father",
      title: `${isAdoption ? "Drugi opiekun" : "Tata"} nie wykorzystuje swoich 9 tygodni rodzicielskiego`,
      description: `${p.parentalExclusiveWeeks - timeline.weeks.parentalUsedFather} tyg. nieprzenoszalnej części przepadnie — nie można jej przekazać drugiemu rodzicowi.`,
      action: "Zaplanuj 9 tygodni dla drugiego rodzica (płatne 70%) — można je wziąć w częściach do końca roku, w którym dziecko skończy 6 lat.",
      legal: [{ act: "Kodeks pracy", ref: "art. 182¹a § 4" }],
    });
  }

  // Urlop ojcowski
  if (timeline.paternityDeadline && s.father && coverage.father?.covered) {
    const planned = timeline.segments.some((x) => x.kind === "paternity");
    const left = diffDays(today, timeline.paternityDeadline);
    risks.push({
      id: "paternity.deadline",
      level: planned ? "info" : left < 60 ? "high" : "medium",
      parent: "father",
      title: planned ? "Urlop ojcowski zaplanowany" : "Urlop ojcowski wygasa",
      description: `2 tygodnie (jednorazowo lub 2 × 7 dni) do ${fmt(timeline.paternityDeadline)}. Po tym terminie prawo wygasa.`,
      legal: [{ act: "Kodeks pracy", ref: "art. 182³ § 1" }],
    });
  }

  if (timeline.weeks.parentalUnused > 0 && timeline.weeks.parentalPool > 0) {
    risks.push({
      id: "parental.unused",
      level: "info",
      title: "Część urlopu rodzicielskiego niewykorzystana w planie",
      description: `${timeline.weeks.parentalUnused} tyg. rodzicielskiego nie jest zaplanowane. Można je wykorzystać później (do 5 części, do końca roku, w którym dziecko skończy 6 lat).`,
      legal: [{ act: "Kodeks pracy", ref: "art. 182¹c" }],
    });
  }

  if (coverage.mother.postTermination) {
    risks.push({
      id: "mother.postTermination",
      level: "positive",
      parent: "mother",
      title: "Zasiłek mimo utraty pracy",
      description: coverage.mother.reasons.find((r) => r.includes("ustało") || r.includes("naruszeniem")) ?? "",
      legal: [{ act: "ustawa zasiłkowa", ref: "art. 30" }],
    });
  }

  const order = { high: 0, medium: 1, info: 2, positive: 3 } as const;
  return risks.sort((a, b) => order[a.level] - order[b.level]);
}
