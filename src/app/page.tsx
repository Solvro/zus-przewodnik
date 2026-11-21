import Link from "next/link";
import { Baby, CalendarHeart, ChevronRight, FileSearch, HandHeart, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui/primitives";

// rendering-hoist-jsx: statyczne dane poza komponentem
const SITUATIONS = [
  {
    href: "/przewodnik?sytuacja=ciaza",
    icon: CalendarHeart,
    title: "Jestem w ciąży",
    text: "Zwolnienie z kodem B, urlop przed porodem, ochrona pracy — i plan na czas po porodzie.",
  },
  {
    href: "/przewodnik?sytuacja=urodzenie",
    icon: Baby,
    title: "Urodziło się dziecko",
    text: "Macierzyński, rodzicielski, ojcowski: ile dostaniecie, jak podzielić urlop i jakie złożyć wnioski.",
  },
  {
    href: "/przewodnik?sytuacja=adopcja",
    icon: Users,
    title: "Adopcja lub rodzina zastępcza",
    text: "Urlop na warunkach urlopu macierzyńskiego i rodzicielski — zależnie od wieku dziecka.",
  },
] as const;

const PROMISES = [
  { icon: ShieldCheck, title: "Sprawdzisz ubezpieczenie", text: "Zanim urodzi się dziecko — a nie po fakcie." },
  { icon: FileSearch, title: "Zobaczysz, skąd kwota", text: "Każda liczba ma wzór i podstawę prawną." },
  { icon: HandHeart, title: "Dostaniesz plan działania", text: "Co, komu i do kiedy złożyć — z przypomnieniami." },
] as const;

export default function Home() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Przewodnik po świadczeniach z ZUS</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-navy sm:text-4xl md:text-5xl">
              Spokojnie przez ciążę i pierwsze miesiące z dzieckiem
            </h1>
            <p className="prose-zus mt-4 text-lg text-muted">
              Odpowiedz na kilka pytań. Policzymy, jakie zasiłki Ci przysługują, ile wyniosą i do kiedy złożyć wnioski —
              dla Ciebie i drugiego rodzica.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/przewodnik" size="lg">
                Sprawdź swoje świadczenia
                <ChevronRight aria-hidden className="size-5" />
              </ButtonLink>
              <ButtonLink href="/kalkulator" variant="link">
                Przejdź od razu do kalkulatora
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Około 3 minut · bez logowania · dane zostają w Twojej przeglądarce</p>
          </div>
          <ul className="grid content-start gap-3" aria-label="Co zyskasz">
            {PROMISES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3 rounded-card bg-primary-50 p-4">
                <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-primary" />
                <div>
                  <p className="font-bold text-navy">{title}</p>
                  <p className="text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="sytuacje">
        <h2 id="sytuacje" className="text-2xl font-black text-navy">
          Od czego zaczynamy?
        </h2>
        <p className="mt-1 text-muted">Wybierz sytuację, która Cię dotyczy.</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {SITUATIONS.map(({ href, icon: Icon, title, text }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-card border-2 border-line bg-surface p-5 shadow-card transition-colors hover:border-primary"
              >
                <Icon aria-hidden className="size-8 text-primary" />
                <span className="mt-3 flex items-center gap-1 text-lg font-bold text-navy">
                  {title}
                  <ChevronRight aria-hidden className="size-5 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-1 text-muted">{text}</span>
              </Link>
            </li>
          ))}
        </ul>

        <Card className="mt-6 flex flex-col gap-3 border-l-4 border-l-muted p-5 sm:flex-row sm:items-center">
          <HeartHandshake aria-hidden className="size-7 shrink-0 text-muted" />
          <div className="flex-1">
            <h2 className="font-bold text-navy">Trudna sytuacja</h2>
            <p className="text-sm text-muted">
              Strata dziecka, poronienie, ciężka choroba dziecka lub mamy. Spokojnie wyjaśnimy, co Ci przysługuje, i
              wskażemy, gdzie szukać wsparcia.
            </p>
          </div>
          <ButtonLink href="/wsparcie/trudna-sytuacja" variant="secondary">
            Zobacz
          </ButtonLink>
        </Card>
      </section>
    </>
  );
}
