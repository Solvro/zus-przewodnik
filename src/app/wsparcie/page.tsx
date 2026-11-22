import { FeatureGate } from "@/components/layout/feature-gate";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { OFFICIAL_LINKS, SUPPORT_TOPICS, type SupportTopic } from "@/content/support";
import { SupportOrgs } from "@/components/support/support-orgs";

export const metadata: Metadata = { title: "Wsparcie i przydatne linki" };

const TOPICS = Object.keys(SUPPORT_TOPICS) as SupportTopic[];

export default function WsparciePage() {
  return (
    <FeatureGate feature="support">
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-black text-navy">Wsparcie</h1>
      <p className="prose-zus mt-2 text-muted">
        Organizacje, które bezpłatnie pomagają rodzicom w trudnych chwilach, oraz oficjalne źródła informacji o urlopach i zasiłkach.
      </p>

      <Link href="/wsparcie/trudna-sytuacja" className="mt-6 flex items-center justify-between gap-3 rounded-card border-2 border-line bg-surface p-5 hover:border-primary">
        <span>
          <span className="block text-lg font-bold text-navy">Trudna sytuacja — co mi przysługuje?</span>
          <span className="block text-muted">Strata dziecka, wcześniak, ciężka choroba dziecka lub mamy, śmierć rodzica.</span>
        </span>
        <ChevronRight aria-hidden className="size-6 shrink-0 text-primary" />
      </Link>

      {TOPICS.map((t) => (
        <section key={t} className="mt-10" aria-labelledby={`t-${t}`}>
          <h2 id={`t-${t}`} className="mb-3 text-xl font-bold text-navy">{SUPPORT_TOPICS[t]}</h2>
          <SupportOrgs filter={t} />
        </section>
      ))}

      <section className="mt-12" aria-labelledby="oficjalne">
        <h2 id="oficjalne" className="text-xl font-bold text-navy">Oficjalne źródła</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {OFFICIAL_LINKS.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noreferrer" className="flex h-full items-start justify-between gap-3 rounded-ui border border-line bg-surface p-4 hover:border-primary">
                <span>
                  <span className="block font-bold text-primary">{l.title}</span>
                  <span className="block text-sm text-muted">{l.desc}</span>
                </span>
                <ExternalLink aria-hidden className="mt-1 size-4 shrink-0 text-muted" />
                <span className="sr-only">(otwiera się w nowej karcie)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
    </FeatureGate>
  );
}

export const dynamic = "force-dynamic";
