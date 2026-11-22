import type { Metadata } from "next";
import Link from "next/link";
import { AiBadge, Badge, Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "O projekcie i wykorzystaniu AI" };

const AI_FEATURES = [
  {
    name: "Odczyt dokumentów sprawy",
    where: "Kalkulator → Sprawa ZUS (upload PDF/zdjęć)",
    how: "Model AI (w demo OpenAI GPT-5.5; alternatywnie Claude Opus 5.5 — dostawca zależy od klucza na serwerze) odczytuje formularze ZAM/ZUR/ZAO, Z-3/Z-3a/Z-3b, poświadczenia i zrzuty systemu do ustalonego schematu (structured outputs). Użytkownik widzi odczytane pola i niepewności, może je poprawić. Prawo do zasiłku i kwoty liczy deterministyczny silnik reguł — nie model.",
  },
  {
    name: "Asystent Q&A z cytatami",
    where: "Asystent (menu)",
    how: "Odpowiedzi oparte na poradniku ZUS 2026 i wyciągach z ustawy zasiłkowej oraz Kodeksu pracy (model dostaje fragmenty źródeł dobrane do pytania i zwraca dosłowne cytaty — serwer sprawdza, że cytat naprawdę występuje w źródle; w demo GPT-5.4 mini). Kwoty i daty model bierze wyłącznie z wyniku silnika dla planu użytkownika. Bez klucza API działa tryb awaryjny (dopasowanie z bazy wiedzy), wyraźnie oznaczony.",
  },
  {
    name: "Prosty język",
    where: "Mój plan → „Wyjaśnij prostym językiem”",
    how: "Przepisanie podsumowania planu (lub pisma) na prostą polszczyznę bez zmiany faktów, kwot i dat.",
  },
];

const NON_AI = [
  "Ustalanie prawa do zasiłku, wymiarów, kwot, terminów i ryzyk — silnik reguł (TypeScript), w pełni deterministyczny, z testami jednostkowymi i testami na sprawach.",
  "Lista dokumentów i kierowanie: płatnik (> 20 ubezpieczonych) czy ZUS.",
  "Wnioski o urlopy wg rozporządzenia Dz.U. 2025 poz. 322 i wniosek ZAM — wypełniane danymi z planu.",
  "Symulacje: mObywatel, dane z ZUS, e-ZLA, zaświadczenie o zadłużeniu, PUE/eZUS, odpis aktu urodzenia.",
];

export default function OProjekciePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black text-navy">Zasiłkowy Przewodnik Przyszłego Rodzica</h1>
      <p className="prose-zus mt-3 text-lg text-muted">
        Prototyp na wyzwanie ZUS w HackNation 2026. Narzędzie prowadzi przyszłych i świeżych rodziców — także adopcyjnych i zastępczych — przez świadczenia z ubezpieczenia chorobowego: od zwolnienia w ciąży, przez urlopy i zasiłek macierzyński, po wnioski i terminy. Liczy uprawnienia dla konkretnej osoby, pokazuje, skąd biorą się kwoty, i ostrzega przed ryzykami.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-navy">Gdzie działa sztuczna inteligencja</h2>
      <ul className="mt-4 grid gap-3">
        {AI_FEATURES.map((f) => (
          <li key={f.name}>
            <Card className="p-5">
              <p className="flex flex-wrap items-center gap-2 text-lg font-bold text-navy">{f.name} <AiBadge /></p>
              <p className="text-sm text-muted">{f.where}</p>
              <p className="mt-2">{f.how}</p>
            </Card>
          </li>
        ))}
      </ul>
      <h3 className="mt-6 font-bold text-navy">Bez AI (deterministycznie)</h3>
      <ul className="mt-2 list-disc space-y-1 pl-6">{NON_AI.map((x) => <li key={x}>{x}</li>)}</ul>
      <p className="mt-3 text-sm text-muted">AI było też używane w procesie tworzenia kodu i treści (asystent programistyczny); każdą regułę zweryfikowano z materiałami ZUS i testami.</p>

      <h2 className="mt-10 text-2xl font-bold text-navy">Architektura</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>Next.js 15 (App Router) + TypeScript + Tailwind, komponenty dostępne (Radix), TanStack Query do komunikacji z API.</li>
        <li>REST API <code>/api/v1</code> ze specyfikacją OpenAPI generowaną ze schematów Zod — <Link className="text-primary underline" href="/api/docs">dokumentacja</Link>.</li>
        <li>Silnik reguł: czyste funkcje z parametrami prawnymi wersjonowanymi datą obowiązywania (panel administracyjny), ślad obliczeń z podstawą prawną.</li>
        <li>Prywatność: dane w sesji przeglądarki, dokumenty przetwarzane w pamięci, klucz AI tylko na serwerze.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-navy">Ograniczenia prototypu</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>Integracje z mObywatelem, ZUS, PUE/eZUS i rejestrem stanu cywilnego są symulowane; dane osób są fikcyjne.</li>
        <li>Szacunek netto uproszczony (zaliczka PIT 12% z kwotą zmniejszającą).</li>
        <li>Lista organizacji wsparcia wymaga weryfikacji przez ZUS przed wdrożeniem.</li>
      </ul>
      <p className="mt-6"><Badge tone="accent">Wynik ma charakter informacyjny — decyzję wydaje ZUS lub płatnik składek.</Badge></p>
    </div>
  );
}
