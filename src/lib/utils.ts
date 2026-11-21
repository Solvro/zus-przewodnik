import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PLN = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 });
const PLN0 = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 });

export const zl = (x: number) => PLN.format(x);
export const zl0 = (x: number) => PLN0.format(x);

export function dateLong(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function dateShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function monthLabel(key: string) {
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("pl-PL", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function pct(rate: number) {
  return `${(Math.round(rate * 1000) / 10).toLocaleString("pl-PL")}%`;
}

export function weeksLabel(n: number) {
  const abs = Math.abs(n);
  if (abs === 1) return `${n} tydzień`;
  const last = abs % 10;
  const lastTwo = abs % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${n} tygodnie`;
  return `${n} tygodni`;
}
