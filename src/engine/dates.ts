/**
 * Operacje na datach kalendarzowych bez stref czasowych.
 * Wszystkie daty to łańcuchy RRRR-MM-DD liczone w UTC, żeby uniknąć przesunięć DST.
 */

const DAY = 86_400_000;

export function toUtc(d: string): number {
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd);
}

export function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  return fromUtc(toUtc(d) + n * DAY);
}

export function addWeeks(d: string, n: number): string {
  return addDays(d, n * 7);
}

export function addMonths(d: string, n: number): string {
  const [y, m, dd] = d.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(dd, lastDay));
  return fromUtc(target.getTime());
}

export function addYears(d: string, n: number): string {
  return addMonths(d, n * 12);
}

/** Liczba dni od a do b (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY);
}

/** Liczba dni kalendarzowych w przedziale domkniętym [start, end]. */
export function spanDays(start: string, end: string): number {
  return diffDays(start, end) + 1;
}

/** Koniec przedziału zaczynającego się `start` i trwającego `days` dni. */
export function endOf(start: string, days: number): string {
  return addDays(start, days - 1);
}

export function minDate(...ds: string[]): string {
  return ds.reduce((a, b) => (a < b ? a : b));
}

export function maxDate(...ds: string[]): string {
  return ds.reduce((a, b) => (a > b ? a : b));
}

export function endOfYear(year: number): string {
  return `${year}-12-31`;
}

export function yearOf(d: string): number {
  return Number(d.slice(0, 4));
}

export function monthKey(d: string): string {
  return d.slice(0, 7);
}

/** Pełne lata życia w dniu `on`. */
export function ageInYears(birth: string, on: string): number {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age--;
  return age;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Format do komunikatów: 21.11.2026 */
export function fmt(d: string): string {
  const [y, m, dd] = d.split("-");
  return `${dd}.${m}.${y}`;
}
