import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { FeatureGate } from "@/components/layout/feature-gate";
import { ButtonLink, Callout } from "@/components/ui/primitives";
import { Term } from "@/components/ui/term";

export const metadata: Metadata = { title: "Świadczenia w ciąży" };
export const dynamic = "force-dynamic";

/*
 * Wymóg (a) z treści zadania: informacje o świadczeniach w czasie ciąży — zasiłek chorobowy,
 * świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego — także o braku uprawnień.
 * Wyliczenie dla konkretnej osoby robi kalkulator (zwolnienia z kodem B) i przewodnik.
 */

const BENEFITS = [
  {
    id: "chorobowy",
    title: "Zasiłek chorobowy w ciąży",
    figure: "100%",
    figureNote: "podstawy, do 270 dni",
    when: [
      <>Lekarz wystawia zwolnienie <Term id="e-ZLA">e-ZLA</Term> z kodem „B” (ciąża). Trafia ono samo do ZUS i do pracodawcy.</>,
      <>Musisz podlegać ubezpieczeniu chorobowemu: przy umowie o pracę prawo powstaje po <strong>30 dniach</strong>, a przy dobrowolnym ubezpieczeniu (zlecenie, działalność) po <strong>90 dniach</strong>. Wcześniejsze okresy wliczamy, jeśli przerwa nie przekroczyła 30 dni.</>,
      <>Pracownica: przez pierwsze <strong>33 dni</strong> choroby w roku (14 dni po 50. roku życia) pracodawca płaci wynagrodzenie chorobowe, potem jest zasiłek. Osoby niebędące pracownikami dostają zasiłek od 1. dnia.</>,
    ],
    docs: [
      "Umowa o pracę: e-ZLA wystarczy. Jeśli zasiłek wypłaca ZUS (pracodawca zgłasza 20 lub mniej osób), pracodawca przekazuje Z-3, a na dalsze okresy ZAS-12.",
      "Umowa zlecenia: e-ZLA + zaświadczenie płatnika Z-3a (jeśli wypłaca ZUS).",
      "Działalność gospodarcza: wniosek ZAS-53 do ZUS.",
    ],
    legal: "Ustawa zasiłkowa art. 4, 6, 8, 11 ust. 2 pkt 2; Kodeks pracy art. 92",
  },
  {
    id: "rehabilitacyjne",
    title: "Świadczenie rehabilitacyjne",
    figure: "100%",
    figureNote: "podstawy w ciąży, do 12 miesięcy",
    when: [
      <>Po wyczerpaniu <strong>270 dni</strong> zasiłku chorobowego, jeśli nadal nie możesz pracować, ale dalsze leczenie lub rehabilitacja rokują powrót do pracy.</>,
      <>O prawie decyduje lekarz orzecznik ZUS. Wniosek ZNp-7 warto złożyć na 6 tygodni przed końcem okresu zasiłkowego.</>,
    ],
    docs: ["Wniosek ZNp-7 i zaświadczenie o stanie zdrowia N-9 — do ZUS."],
    legal: "Ustawa zasiłkowa art. 18–19",
  },
  {
    id: "po-ustaniu",
    title: "Zasiłek w wysokości zasiłku macierzyńskiego",
    figure: "100%",
    figureNote: "podstawy, do dnia porodu",
    when: [
      <>Umowę o pracę rozwiązano w ciąży z powodu <strong>upadłości, likwidacji lub śmierci pracodawcy</strong> i nie masz innej pracy.</>,
      <>Albo umowę rozwiązano z naruszeniem przepisów — potwierdzone <strong>prawomocnym wyrokiem sądu</strong>.</>,
      <>Wypłaca ZUS od dnia po ustaniu zatrudnienia do porodu. Po porodzie przysługuje zasiłek macierzyński.</>,
    ],
    docs: ["Wniosek do ZUS ze świadectwem pracy i zaświadczeniem lekarskim o ciąży (lub wyrokiem sądu)."],
    legal: "Ustawa zasiłkowa art. 30 ust. 3",
  },
] as const;

const NO_RIGHT = [
  "Pracujesz na zleceniu lub prowadzisz działalność i nie zgłosiłaś się do dobrowolnego ubezpieczenia chorobowego.",
  "Nie minął okres wyczekiwania (30 lub 90 dni) — wtedy zasiłek przysługuje dopiero od dnia, w którym minie.",
  "Umowa skończyła się przed ciążą lub w jej pierwszych 3 miesiącach z innych powodów niż upadłość, likwidacja albo śmierć pracodawcy.",
  "Umowę lub działalność ZUS uzna za zawartą „dla pozoru” — tylko po to, by dostać zasiłek.",
];

export default function CiazaPage() {
  return (
    <FeatureGate feature="pregnancy">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <h1 className="text-4xl text-navy md:text-5xl">Świadczenia w ciąży</h1>
        <p className="prose-zus mt-3 text-lg text-ink/80">
          Co możesz dostać z ZUS, gdy w ciąży nie możesz pracować — i kiedy świadczenie <span className="hl">nie
          przysługuje</span>. Swoją kwotę policzysz w kalkulatorze, dodając zwolnienia z kodem „B”.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/przewodnik?sytuacja=ciaza" size="lg">
            Sprawdź, co mi przysługuje <ArrowRight aria-hidden className="size-5" />
          </ButtonLink>
          <ButtonLink href="/kalkulator" variant="secondary" size="lg">
            Policz zasiłek chorobowy
          </ButtonLink>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <section key={b.id} aria-labelledby={b.id} className="flex flex-col rounded-card border border-line bg-surface p-6 shadow-card">
              <h2 id={b.id} className="text-xl text-navy">{b.title}</h2>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-4xl text-primary">{b.figure}</span>
                <span className="text-sm text-muted">{b.figureNote}</span>
              </p>
              <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-muted">Kiedy przysługuje</h3>
              <ul className="mt-2 space-y-2">
                {b.when.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-muted">Dokumenty</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {b.docs.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <p className="mt-auto pt-5 text-xs text-muted">{b.legal}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <section aria-labelledby="brak" className="rounded-card border border-danger/30 bg-danger-50 p-6">
            <h2 id="brak" className="flex items-center gap-2 text-xl text-navy">
              <CircleX aria-hidden className="size-6 text-danger" /> Kiedy świadczenia nie ma
            </h2>
            <ul className="mt-3 space-y-2">
              {NO_RIGHT.map((n) => (
                <li key={n} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-danger" />
                  {n}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="ochrona" className="rounded-card border border-line bg-surface p-6">
            <h2 id="ochrona" className="flex items-center gap-2 text-xl text-navy">
              <CircleAlert aria-hidden className="size-6 text-warning" /> Ochrona pracy w ciąży
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Pracodawca nie może wypowiedzieć ani rozwiązać umowy o pracę w ciąży i na urlopie macierzyńskim (wyjątek: Twoja ciężka wina i zgoda związku zawodowego, upadłość lub likwidacja).</li>
              <li>Umowa na czas określony lub na okres próbny dłuższy niż miesiąc, która skończyłaby się po 3. miesiącu ciąży, <strong>przedłuża się do dnia porodu</strong>.</li>
              <li>Ochrona z Kodeksu pracy <strong>nie dotyczy</strong> zleceniobiorczyń i osób prowadzących działalność.</li>
            </ul>
            <p className="mt-3 text-xs text-muted">Kodeks pracy art. 177</p>
          </section>
        </div>

        <Callout tone="info" className="mt-8" title="Zwolnienia lekarskie i dane z ZUS">
          Swoje zwolnienia e-ZLA i dane o ubezpieczeniu zobaczysz w{" "}
          <Link href="/konto" className="font-bold underline underline-offset-4">koncie (symulacja eZUS)</Link>. Pytanie do doradcy ZUS
          zadasz tam przez skrzynkę wiadomości.
        </Callout>
      </div>
    </FeatureGate>
  );
}
