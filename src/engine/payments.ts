import { addDays, endOf, monthKey } from "./dates";
import type { RawSegment } from "./leave";
import { round2, type LegalParams } from "./params";
import type { MonthlyRow, Parent, Segment } from "./types";

const MATERNITY_FAMILY = new Set([
  "prenatal",
  "maternity",
  "maternity_transfer",
  "adoption_maternity",
  "supplementary",
  "parental",
  "parental_exclusive",
  "parental_extension",
  "paternity",
  "loss",
  "post_termination",
]);

/**
 * Kwoty: miesięczny zasiłek = podstawa × stawka × (1 − wymiar pracy); za dzień 1/30 kwoty miesięcznej
 * (art. 11 ust. 4 w zw. z art. 31 ust. 5). Zasiłek macierzyński nie niższy niż świadczenie rodzicielskie (art. 31 ust. 3a).
 */
export function priceSegments(
  raw: RawSegment[],
  bases: Partial<Record<Parent, number>>,
  paidBy: Partial<Record<Parent, "payer" | "zus">>,
  p: LegalParams,
): Segment[] {
  return raw
    .filter((r) => r.days > 0)
    .map((r) => {
      const basis = bases[r.parent] ?? 0;
      let monthly = round2(basis * r.rate * (1 - r.workFraction));
      if (MATERNITY_FAMILY.has(r.kind) && r.workFraction === 0 && basis > 0 && monthly < p.parentalBenefitFloor) {
        monthly = p.parentalBenefitFloor;
      }
      const daily = round2(monthly / 30);
      return {
        id: r.id,
        parent: r.parent,
        kind: r.kind,
        label: r.label,
        start: r.start,
        end: endOf(r.start, r.days),
        days: r.days,
        rate: r.rate,
        workFraction: r.workFraction,
        monthlyAmount: monthly,
        dailyAmount: daily,
        total: round2(daily * r.days),
        paidBy: r.kind === "sick_pay" ? "employer" : (paidBy[r.parent] ?? "zus"),
        legal: r.legal,
      } satisfies Segment;
    });
}

export function monthlyBreakdown(segments: Segment[]): MonthlyRow[] {
  const map = new Map<string, MonthlyRow>();
  for (const seg of segments) {
    for (let i = 0; i < seg.days; i++) {
      const key = monthKey(addDays(seg.start, i));
      const row = map.get(key) ?? { month: key, mother: 0, father: 0, total: 0 };
      row[seg.parent] += seg.dailyAmount;
      row.total += seg.dailyAmount;
      map.set(key, row);
    }
  }
  return [...map.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((r) => ({ month: r.month, mother: round2(r.mother), father: round2(r.father), total: round2(r.total) }));
}

/** Szacunek netto: zaliczka PIT 12% zaokrąglona do pełnych złotych, pomniejszona o kwotę zmniejszającą (PIT-2). */
export function netEstimate(rows: MonthlyRow[], p: LegalParams): number {
  let net = 0;
  for (const r of rows) {
    for (const gross of [r.mother, r.father]) {
      if (gross <= 0) continue;
      const tax = Math.max(0, Math.round(gross * p.pitRate) - p.pitMonthlyReduction);
      net += gross - tax;
    }
  }
  return round2(net);
}
