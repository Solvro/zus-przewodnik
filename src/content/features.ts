/** Moduły aplikacji, które administrator może włączać i wyłączać (wymóg: „dodanie nowych funkcjonalności bądź ich usprawnienie w panelu administracyjnym”). */
export const FEATURES = [
  { key: "assistant", label: "Asystent AI (pytania i odpowiedzi)", href: "/asystent" },
  { key: "documentUpload", label: "Odczyt dokumentów sprawy przez AI (upload)", href: "/kalkulator/sprawa" },
  { key: "plainLanguage", label: "Prosty język (przepisanie planu przez AI)", href: "/plan" },
  { key: "applications", label: "Wnioski o urlopy i ZAM (wypełnianie, wysyłka)", href: "/wnioski" },
  { key: "account", label: "Konto eZUS (dane ZUS, e-ZLA, zadłużenie, odpis aktu)", href: "/konto" },
  { key: "pregnancy", label: "Strona „Świadczenia w ciąży”", href: "/ciaza" },
  { key: "support", label: "Wsparcie i organizacje charytatywne", href: "/wsparcie" },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];
export type FeatureFlags = Record<FeatureKey, boolean>;

export const DEFAULT_FEATURES: FeatureFlags = Object.fromEntries(FEATURES.map((f) => [f.key, true])) as FeatureFlags;

/** Moduł wyłączony dla danej ścieżki (do ukrywania nawigacji). */
export function featureForPath(path: string): FeatureKey | null {
  const f = FEATURES.find((x) => x.href !== "/plan" && (path === x.href || path.startsWith(`${x.href}/`)));
  return f?.key ?? null;
}
