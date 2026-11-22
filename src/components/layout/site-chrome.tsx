"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarHeart,
  Calculator,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  MessageCircleQuestion,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useFeatures } from "@/lib/api/queries";
import type { FeatureKey } from "@/content/features";
import { cn } from "@/lib/utils";
import { A11yToolbar } from "./a11y-toolbar";
import { useEffect } from "react";
import { rehydrateSession, useSession } from "@/lib/session";

const NAV: { href: string; label: string; icon: LucideIcon; feature?: FeatureKey }[] = [
  { href: "/plan", label: "Mój plan", icon: LayoutDashboard },
  { href: "/kalkulator", label: "Kalkulator", icon: Calculator },
  { href: "/ciaza", label: "W ciąży", icon: CalendarHeart, feature: "pregnancy" },
  { href: "/wnioski", label: "Wnioski", icon: FileText, feature: "applications" },
  { href: "/wsparcie", label: "Wsparcie", icon: HeartHandshake, feature: "support" },
];

const MOBILE_NAV: typeof NAV = [
  ...NAV.filter((n) => n.href !== "/ciaza"),
  { href: "/asystent", label: "Asystent", icon: MessageCircleQuestion, feature: "assistant" },
];

function useNav(items: typeof NAV) {
  const features = useFeatures();
  return items.filter((n) => !n.feature || features[n.feature]);
}

export function Header() {
  const pathname = usePathname();
  const nav = useNav(NAV);
  const session = useSession();
  useEffect(rehydrateSession, []);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <a
        href="#tresc"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-ui focus:bg-accent focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Przejdź do treści
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav aria-label="Główna" className="ml-4 hidden items-stretch gap-1 self-stretch md:flex">
          {nav.map(({ href, label }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center px-3 font-bold text-ink/80 transition-colors hover:text-navy",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-transparent after:transition-colors hover:after:bg-line",
                  active && "text-navy after:bg-accent hover:after:bg-accent",
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
            className="hidden min-h-11 items-center gap-2 rounded-full bg-navy px-4 text-sm font-bold text-paper hover:bg-primary-strong sm:inline-flex"
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
  const nav = useNav(MOBILE_NAV);
  return (
    <nav
      aria-label="Nawigacja mobilna"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-bold text-muted",
                  active && "text-navy",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-accent")}>
                  <Icon aria-hidden className={cn("size-5", active && "stroke-[2.5]")} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const SOURCES = [
  { href: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski", label: "ZUS — zasiłek macierzyński" },
  { href: "https://www.gov.pl/web/rodzina/urlop-rodzicielski", label: "Ministerstwo Rodziny — urlop rodzicielski" },
  { href: "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo", label: "PIP — rodzicielstwo" },
];
const ABOUT = [
  { href: "/o-projekcie", label: "O projekcie i wykorzystaniu AI" },
  { href: "/dostepnosc", label: "Deklaracja dostępności" },
  { href: "/api/docs", label: "API (OpenAPI)" },
  { href: "/admin", label: "Panel administracyjny" },
];
const footLink = "text-paper underline decoration-paper/40 underline-offset-4 hover:decoration-accent";

export function Footer() {
  return (
    <footer className="mt-20 bg-navy pb-24 text-paper [--c-logo-bg:#fbf7f0] [--c-logo-fg:#12352a] [--c-focus:#fab856] md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-sm text-paper/80">
            Prototyp na HackNation 2026 dla ZUS. Wyniki są symulacją — prawo do świadczeń i ich wysokość ustala ZUS
            lub płatnik składek w decyzji.
          </p>
        </div>
        <div>
          <h2 className="text-base text-paper">Oficjalne źródła</h2>
          <ul className="mt-3 space-y-2">
            {SOURCES.map((l) => (
              <li key={l.href}>
                <a className={footLink} href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-base text-paper">O serwisie</h2>
          <ul className="mt-3 space-y-2">
            {ABOUT.map((l) => (
              <li key={l.href}>
                <Link className={footLink} href={l.href}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
