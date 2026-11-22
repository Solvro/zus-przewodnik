import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileScan, HeartHandshake } from "lucide-react";
import { AiBadge, ButtonLink } from "@/components/ui/primitives";

// rendering-hoist-jsx: statyczne dane poza komponentem
const SITUATIONS = [
  {
    href: "/przewodnik?sytuacja=ciaza",
    title: "Jestem w ciąży",
    figure: "270 dni",
    caption: "zasiłku chorobowego w ciąży, 100% podstawy",
  },
  {
    href: "/przewodnik?sytuacja=urodzenie",
    title: "Urodziło się dziecko",
    figure: "20 + 41 tyg.",
    caption: "urlopu macierzyńskiego i rodzicielskiego",
  },
  {
    href: "/przewodnik?sytuacja=urodzenie",
    title: "Jestem tatą",
    figure: "9 tyg.",
    caption: "rodzicielskiego tylko dla Ciebie — przepadają, jeśli ich nie weźmiesz",
  },
  {
    href: "/przewodnik?sytuacja=adopcja",
    title: "Adopcja lub rodzina zastępcza",
    figure: "do 14 lat",
    caption: "wieku dziecka — urlop na warunkach macierzyńskiego",
  },
] as const;

const STEPS = [
  { title: "Odpowiadasz na kilka pytań", text: "Albo logujesz się przez mObywatel i pobieramy dane z ZUS." },
  { title: "Dostajesz plan dla dwojga", text: "Kwoty, oś czasu, kto wypłaca, ryzyka — z podstawą prawną przy każdej liczbie." },
  { title: "Składasz wnioski na czas", text: "Wypełnione za Ciebie, z terminami i informacją: pracodawca czy ZUS." },
] as const;

/**
 * Przykładowy plan — ilustracja produktu. Liczby policzone silnikiem: poród 1.07.2026, mama 7 000 zł brutto,
 * tata 9 000 zł brutto, tata bierze ojcowski i 9 tygodni rodzicielskiego (oś: 62 tygodnie).
 */
function SamplePlan() {
  const months = ["lip", "wrz", "lis", "sty", "mar", "maj", "lip"];
  return (
    <figure className="relative">
      <div className="rotate-[0.6deg] rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
        <figcaption className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg text-navy">Plan Ani i Tomka</span>
          <span className="text-xs font-bold text-muted">przykład</span>
        </figcaption>

        <div className="mt-5" aria-hidden>
          <div className="grid grid-cols-7 text-[0.68rem] font-bold uppercase tracking-wide text-muted">
            {months.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
          <div className="mt-2 space-y-3">
            <Lane who="Ania">
              <Bar from={0} to={32} className="bg-rate-100 text-white" label="macierzyński 100%" />
              <Bar from={32} to={84} className="bg-rate-70 text-ink ring-1 ring-inset ring-primary/30" label="rodzicielski 70%" />
            </Lane>
            <Lane who="Tomek">
              <Bar from={0} to={3.5} className="bg-navy" />
              <Bar from={84} to={98.5} className="bg-[#2f6b8f] text-white" label="9 tyg." />
            </Lane>
          </div>
        </div>
        <p className="sr-only">
          Przykład: Ania bierze urlop macierzyński (100%) i rodzicielski (70%), Tomek urlop ojcowski i 9 tygodni
          rodzicielskiego.
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-dashed border-line pt-4">
          <Stat label="Ania, miesięcznie" value="6 040 zł" />
          <Stat label="Razem dla rodziny" value="74,8 tys. zł" />
          <Stat label="Powrót Ani" value="lip 2027" />
        </dl>
      </div>

      <div className="relative -mt-3 ml-2 w-fit max-w-[15rem] -rotate-2 rounded-ui bg-accent px-4 py-3 text-sm font-bold text-ink shadow-card sm:-ml-4">
        21 dni na wniosek o 81,5% — przypomnimy Ci.
      </div>
    </figure>
  );
}

function Lane({ who, children }: { who: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-xs font-bold text-muted">{who}</span>
      <div className="relative h-7 flex-1 rounded-full bg-paper-deep">{children}</div>
    </div>
  );
}

function Bar({ from, to, className, label }: { from: number; to: number; className: string; label?: string }) {
  return (
    <span
      className={`absolute inset-y-0 flex items-center overflow-hidden rounded-full px-2.5 text-[0.68rem] font-bold whitespace-nowrap ${className}`}
      style={{ left: `${from}%`, width: `${to - from}%` }}
    >
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.7rem] font-bold text-muted">{label}</dt>
      <dd className="font-display tabular mt-0.5 text-lg text-navy sm:text-xl">{value}</dd>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <section className="paper-grid border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-16 md:grid-cols-[1.1fr_1fr] md:pt-20 md:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-1 text-sm font-bold text-muted sm:rounded-full">
              <span className="size-2 rounded-full bg-accent" aria-hidden />
              Dla przyszłych i świeżych rodziców — także adopcyjnych i zastępczych
            </p>
            <h1 className="mt-5 text-[2.4rem] leading-[1.05] text-navy sm:text-5xl md:text-[3.6rem]">
              Wasz urlop rodzicielski, <span className="hl">policzony</span> co do dnia i złotówki
            </h1>
            <p className="prose-zus mt-5 text-lg text-ink/80">
              Rodzicownik sprawdzi ubezpieczenie, policzy zasiłek dla mamy i taty, ułoży wspólną oś czasu i przypomni
              o terminach, zanim miną.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/przewodnik" size="lg">
                Ułóż nasz plan
                <ArrowRight aria-hidden className="size-5" />
              </ButtonLink>
              <ButtonLink href="/kalkulator" variant="secondary" size="lg">
                Otwórz kalkulator
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Około 3 minut · bez logowania · dane zostają w Twojej przeglądarce</p>
          </div>
          <div className="px-2 sm:px-6 md:px-0">
            <SamplePlan />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="sytuacje">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="sytuacje" className="text-3xl text-navy">
            Od czego zaczynamy?
          </h2>
          <p className="text-muted">Wybierz sytuację — resztę dopytamy.</p>
        </div>
        <ul className="mt-6 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {SITUATIONS.map(({ href, title, figure, caption }) => (
            <li key={title} className="bg-surface">
              <Link href={href} className="group flex h-full flex-col p-5 transition-colors hover:bg-primary-50 sm:p-6">
                <span className="flex items-center justify-between gap-2 font-bold text-navy">
                  {title}
                  <ArrowUpRight
                    aria-hidden
                    className="size-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
                <span className="font-display tabular mt-6 text-4xl text-primary">{figure}</span>
                <span className="mt-1 text-sm text-muted">{caption}</span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/wsparcie/trudna-sytuacja"
          className="mt-4 flex flex-col gap-2 rounded-card border border-line bg-paper-deep/60 p-5 transition-colors hover:bg-paper-deep sm:flex-row sm:items-center sm:gap-4"
        >
          <HeartHandshake aria-hidden className="size-6 shrink-0 text-muted" />
          <span className="flex-1">
            <span className="block font-bold text-navy">Trudna sytuacja</span>
            <span className="block text-sm text-muted">
              Strata dziecka, poronienie, ciężka choroba dziecka lub mamy. Spokojnie wyjaśnimy, co przysługuje, i
              wskażemy, gdzie szukać wsparcia.
            </span>
          </span>
          <span className="text-sm font-bold text-primary underline underline-offset-4">Zobacz</span>
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="jak">
        <h2 id="jak" className="text-3xl text-navy">
          Jak to działa
        </h2>
        <ol className="relative mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
          <span aria-hidden className="absolute top-5 right-[16%] left-[16%] hidden h-0.5 bg-line md:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
              <span className="font-display relative grid size-10 shrink-0 place-items-center rounded-full border-2 border-primary bg-paper text-lg text-primary">
                {i + 1}
              </span>
              <span>
                <span className="block text-lg font-bold text-navy">{s.title}</span>
                <span className="mt-1 block text-muted">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="sprawa">
        <div className="grid items-center gap-6 rounded-card bg-navy p-6 text-paper sm:p-10 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center gap-3">
              <FileScan aria-hidden className="size-7 text-accent" />
              <AiBadge className="border-paper/30 bg-paper/10 text-paper" />
            </div>
            <h2 id="sprawa" className="mt-3 text-2xl text-paper sm:text-3xl">
              Masz już dokumenty sprawy?
            </h2>
            <p className="mt-2 max-w-xl text-paper/80">
              Wgraj wniosek ZAM, zaświadczenie Z-3 albo poświadczenie ubezpieczenia. AI odczyta dane, a silnik reguł
              sprawdzi ubezpieczenie i policzy zasiłek — z porównaniem do decyzji.
            </p>
          </div>
          <Link
            href="/kalkulator/sprawa"
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-accent px-7 text-lg font-bold text-ink transition-transform hover:-translate-y-0.5"
          >
            Sprawdź sprawę
            <ArrowRight aria-hidden className="size-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
