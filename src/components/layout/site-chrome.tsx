"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, FileText, HeartHandshake, LayoutDashboard, MessageCircleQuestion, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { A11yToolbar } from "./a11y-toolbar";
import { useEffect } from "react";
import { rehydrateSession, useSession } from "@/lib/session";

const NAV = [
  { href: "/plan", label: "Mój plan", icon: LayoutDashboard },
  { href: "/kalkulator", label: "Kalkulator", icon: Calculator },
  { href: "/wnioski", label: "Wnioski", icon: FileText },
  { href: "/wsparcie", label: "Wsparcie", icon: HeartHandshake },
] as const;

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-ui py-1" aria-label="Przewodnik Rodzica — strona główna">
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="10" fill="var(--c-primary)" />
        <circle cx="15" cy="14" r="4.5" fill="#fff" />
        <circle cx="26.5" cy="17.5" r="3.2" fill="var(--c-accent)" />
        <path d="M8 31c0-5.5 3.2-9 7-9s7 3.5 7 9" fill="#fff" />
        <path d="M21.5 31c0-4 2.2-6.6 5-6.6s5 2.6 5 6.6" fill="var(--c-accent)" />
      </svg>
      <span className="leading-tight">
        <span className="block text-[0.95rem] font-black text-navy">Przewodnik Rodzica</span>
        <span className="hidden text-xs font-bold text-primary min-[400px]:block">świadczenia z ZUS · prototyp</span>
      </span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const session = useSession();
  useEffect(rehydrateSession, []);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <a
        href="#tresc"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-ui focus:bg-accent focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Przejdź do treści
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav aria-label="Główna" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-ui px-3 py-2 font-bold text-ink hover:bg-primary-50",
                  active && "bg-primary-50 text-primary-strong",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden lg:block">
            <A11yToolbar />
          </div>
          <div className="lg:hidden">
            <A11yToolbar compact />
          </div>
          <Link
            href={session.user ? "/konto" : "/logowanie"}
            className="hidden min-h-11 items-center gap-2 rounded-ui border-2 border-primary px-3 text-sm font-bold text-primary hover:bg-primary-50 sm:inline-flex"
          >
            <UserRound aria-hidden className="size-4" />
            {session.hydrated && session.user ? session.user.firstName : "Zaloguj"}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Dolna nawigacja na telefonie — w zasięgu kciuka. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Nawigacja mobilna"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {[...NAV, { href: "/asystent", label: "Asystent", icon: MessageCircleQuestion }].map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-bold text-muted",
                  active && "text-primary",
                )}
              >
                <Icon aria-hidden className={cn("size-6", active && "stroke-[2.5]")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-muted">
            Prototyp HackNation 2026. Wyniki są symulacją — prawo do świadczeń i ich wysokość ustala ZUS lub płatnik
            składek w decyzji.
          </p>
        </div>
        <div>
          <h2 className="font-bold text-navy">Oficjalne źródła</h2>
          <ul className="mt-2 space-y-1.5">
            <li><a className="text-primary underline underline-offset-4" href="https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski" target="_blank" rel="noreferrer">ZUS — zasiłek macierzyński</a></li>
            <li><a className="text-primary underline underline-offset-4" href="https://www.gov.pl/web/rodzina/urlop-rodzicielski" target="_blank" rel="noreferrer">Ministerstwo Rodziny — urlop rodzicielski</a></li>
            <li><a className="text-primary underline underline-offset-4" href="https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo" target="_blank" rel="noreferrer">PIP — rodzicielstwo</a></li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-navy">O serwisie</h2>
          <ul className="mt-2 space-y-1.5">
            <li><Link className="text-primary underline underline-offset-4" href="/o-projekcie">O projekcie i wykorzystaniu AI</Link></li>
            <li><Link className="text-primary underline underline-offset-4" href="/dostepnosc">Deklaracja dostępności</Link></li>
            <li><Link className="text-primary underline underline-offset-4" href="/api/docs">API (OpenAPI)</Link></li>
            <li><Link className="text-primary underline underline-offset-4" href="/admin">Panel administracyjny</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
