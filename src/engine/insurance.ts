import { addDays, addMonths, diffDays, fmt } from "./dates";
import { derived, type LegalParams } from "./params";
import type { LegalRef, ParentInput } from "./types";

export interface CoverageResult {
  covered: boolean;
  kind: "mandatory" | "voluntary" | null;
  /** Ubezpieczenie trwa dzięki przedłużeniu umowy terminowej do dnia porodu (KP art. 177 § 3). */
  extendedToBirth: boolean;
  /** Prawo do zasiłku mimo ustania ubezpieczenia w ciąży (art. 30 ust. 1). */
  postTermination: boolean;
  /** Prawo do „zasiłku w wysokości zasiłku macierzyńskiego” do dnia porodu (art. 30 ust. 3). */
  postTerminationBenefitUntilBirth: boolean;
  /** Zaległość JDG > 1% minimalnego wynagrodzenia — świadczenie wstrzymane do spłaty. */
  blockedByDebt: boolean;
  reasons: string[];
  legal: LegalRef[];
}

export function sicknessInsuranceKind(p: ParentInput): "mandatory" | "voluntary" | null {
  if (p.title === "employment") return "mandatory";
  if ((p.title === "mandate" || p.title === "business") && p.voluntarySickness) return "voluntary";
  return null;
}

function activeOn(p: ParentInput, date: string): boolean {
  if (p.insuranceStart && p.insuranceStart > date) return false;
  if (p.insuranceEnd && p.insuranceEnd < date) return false;
  return true;
}

/** Początek ciąży szacowany jako termin porodu − 280 dni. */
export function pregnancyStart(dueDate: string): string {
  return addDays(dueDate, -280);
}

/**
 * Czy rodzic podlega ubezpieczeniu chorobowemu w dniu powstania prawa do zasiłku macierzyńskiego
 * (dzień porodu / przyjęcia dziecka). Zasiłek macierzyński nie wymaga okresu wyczekiwania.
 */
export function coverageOn(
  parent: ParentInput,
  date: string,
  ctx: { dueDate?: string; isMother: boolean; isBirth: boolean },
  p: LegalParams,
): CoverageResult {
  const r: CoverageResult = {
    covered: false,
    kind: sicknessInsuranceKind(parent),
    extendedToBirth: false,
    postTermination: false,
    postTerminationBenefitUntilBirth: false,
    blockedByDebt: false,
    reasons: [],
    legal: [{ act: "ustawa zasiłkowa", ref: "art. 29 ust. 1" }],
  };

  if (parent.title === "none") {
    r.reasons.push("Brak tytułu do ubezpieczenia chorobowego (nie pracujesz na umowę ani nie prowadzisz działalności).");
    return r;
  }
  if (!r.kind) {
    r.reasons.push(
      parent.title === "mandate"
        ? "Przy umowie zlecenia ubezpieczenie chorobowe jest dobrowolne — nie zostało zgłoszone."
        : "Przy działalności gospodarczej ubezpieczenie chorobowe jest dobrowolne — nie zostało zgłoszone.",
    );
    r.legal.push({ act: "ustawa o sus", ref: "art. 11 ust. 2" });
    return r;
  }

  if (activeOn(parent, date)) {
    r.covered = true;
    r.reasons.push(
      `W dniu ${fmt(date)} podlegasz ubezpieczeniu chorobowemu (${r.kind === "mandatory" ? "obowiązkowo" : "dobrowolnie"}).`,
    );
  } else if (parent.insuranceStart && parent.insuranceStart > date) {
    r.reasons.push(`Ubezpieczenie zaczyna się dopiero ${fmt(parent.insuranceStart)} — po dniu ${fmt(date)}.`);
  } else if (parent.insuranceEnd) {
    // Ubezpieczenie ustało przed zdarzeniem — sprawdzamy wyjątki dla matki w ciąży.
    const end = parent.insuranceEnd;
    const pregStart = ctx.dueDate ? pregnancyStart(ctx.dueDate) : null;
    const endedInPregnancy = pregStart !== null && end >= pregStart;

    if (
      ctx.isMother &&
      ctx.isBirth &&
      parent.title === "employment" &&
      (parent.contractType === "fixed" || parent.contractType === "trial") &&
      pregStart &&
      end > addMonths(pregStart, 3)
    ) {
      r.covered = true;
      r.extendedToBirth = true;
      r.reasons.push(
        `Umowa terminowa kończąca się po 3. miesiącu ciąży (${fmt(end)}) przedłuża się z mocy prawa do dnia porodu.`,
      );
      r.legal.push({ act: "Kodeks pracy", ref: "art. 177 § 3" }, { act: "ustawa zasiłkowa", ref: "art. 30 ust. 4" });
    } else if (
      ctx.isMother &&
      ctx.isBirth &&
      endedInPregnancy &&
      parent.endReason &&
      ["bankruptcy", "liquidation", "employer_death", "unlawful_court"].includes(parent.endReason)
    ) {
      r.covered = true;
      r.postTermination = true;
      r.postTerminationBenefitUntilBirth = parent.endReason !== "unlawful_court";
      r.reasons.push(
        parent.endReason === "unlawful_court"
          ? "Umowę rozwiązano w ciąży z naruszeniem prawa (potwierdzone prawomocnym wyrokiem) — zasiłek macierzyński przysługuje mimo ustania ubezpieczenia."
          : "Ubezpieczenie ustało w ciąży z powodu upadłości, likwidacji lub śmierci pracodawcy — przysługuje zasiłek w wysokości zasiłku macierzyńskiego do porodu, a potem zasiłek macierzyński.",
      );
      r.legal.push({ act: "ustawa zasiłkowa", ref: "art. 30 ust. 1 i 3" });
    } else {
      r.reasons.push(`Ubezpieczenie chorobowe ustało ${fmt(end)} — przed dniem ${fmt(date)}.`);
    }
  }

  if (parent.title === "business" && parent.contributionDebt > derived(p).debtThreshold) {
    r.blockedByDebt = true;
    r.reasons.push(
      `Zaległość w składkach (${parent.contributionDebt.toFixed(2)} zł) przekracza 1% minimalnego wynagrodzenia (${derived(p).debtThreshold.toFixed(2)} zł) — świadczenie nie zostanie wypłacone do czasu spłaty.`,
    );
    r.legal.push({ act: "Poradnik ZUS 2026", ref: "s. 25 — zaległość > 1% minimalnego wynagrodzenia" });
  }

  return r;
}

/** Okres wyczekiwania na zasiłek chorobowy (30 / 90 dni). Nie dotyczy zasiłku macierzyńskiego. */
export function waitingPeriod(parent: ParentInput, sickStart: string, p: LegalParams) {
  const kind = sicknessInsuranceKind(parent);
  const required = kind === "voluntary" ? p.waitingDaysVoluntary : p.waitingDaysMandatory;
  if (!kind) return { satisfied: false, required, insuredDays: 0, firstEligibleDay: null as string | null };
  if (!parent.insuranceStart) return { satisfied: true, required, insuredDays: Infinity, firstEligibleDay: sickStart };
  const insuredDays = diffDays(parent.insuranceStart, sickStart);
  const firstEligibleDay = addDays(parent.insuranceStart, required);
  return { satisfied: insuredDays >= required, required, insuredDays, firstEligibleDay };
}

/** Kto ustala i wypłaca zasiłek: płatnik (>20 ubezpieczonych) czy ZUS. JDG — zawsze ZUS. */
export function whoPays(parent: ParentInput, p: LegalParams): { who: "payer" | "zus" | "unknown"; reason: string } {
  if (parent.title === "business")
    return { who: "zus", reason: "Osobom prowadzącym działalność zasiłki zawsze wypłaca ZUS." };
  if (parent.title === "none") return { who: "unknown", reason: "Brak płatnika składek." };
  if (parent.payerInsuredCount === undefined)
    return {
      who: "unknown",
      reason: `Zależy od wielkości płatnika: jeśli zgłasza do ubezpieczenia chorobowego więcej niż ${p.largePayerThreshold} osób (stan na 30 listopada poprzedniego roku), zasiłek wypłaca pracodawca/zleceniodawca; jeśli ${p.largePayerThreshold} lub mniej — ZUS.`,
    };
  return parent.payerInsuredCount > p.largePayerThreshold
    ? {
        who: "payer",
        reason: `Płatnik zgłasza ${parent.payerInsuredCount} ubezpieczonych (> ${p.largePayerThreshold}) — sam ustala i wypłaca zasiłek w terminie wypłaty wynagrodzeń.`,
      }
    : {
        who: "zus",
        reason: `Płatnik zgłasza ${parent.payerInsuredCount} ubezpieczonych (≤ ${p.largePayerThreshold}) — przekazuje dokumenty do ZUS, który wypłaca zasiłek do ${p.zusPaymentMaxDays} dni od wyjaśnienia ostatniej okoliczności.`,
      };
}
