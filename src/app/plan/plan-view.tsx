"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, CheckCircle2, CircleSlash, FileText, HeartHandshake, MessageCircleQuestion, Pencil, ShieldCheck } from "lucide-react";
import { rehydrateScenario, useScenario, useScenarioHydrated, useScenarioSource, useScenarioTouched } from "@/lib/scenario-store";
import { rehydrateSession, useSession } from "@/lib/session";
import { useCalculation } from "@/lib/use-calculation";
import { useFeatures, useInsuredQuery } from "@/lib/api/queries";
import { dateLong, dateShort } from "@/lib/utils";
import { Badge, ButtonLink, Callout, Card, CardHeader } from "@/components/ui/primitives";
import { Timeline } from "@/components/results/timeline";
import { MonthlyChart } from "@/components/results/monthly-chart";
import { DocumentList, RiskList, SummaryStats } from "@/components/results/result-blocks";
import { parentLabels } from "@/components/results/results-panel";
import { SupportOrgs } from "@/components/support/support-orgs";
import { PlainLanguageCard } from "@/components/plan/plain-language-card";

export function PlanView() {
  const features = useFeatures();
  useEffect(() => {
    rehydrateScenario();
    rehydrateSession();
  }, []);
  const s = useScenario();
  const hydrated = useScenarioHydrated();
  const source = useScenarioSource();
  const touched = useScenarioTouched();
  const { user } = useSession();
  const insured = useInsuredQuery(user?.personaId);
  const { outcome, refetch } = useCalculation(s);
  const labels = parentLabels(s);
  const sensitive = !!s.loss;

  if (hydrated && !touched && !user) {
    // Brak danych — pusty stan z jasną akcją (empty-states)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-black text-navy">Mój plan rodzicielski</h1>
        <p className="prose-zus mt-2 text-muted">
          Tu zobaczysz swój plan: co Ci przysługuje, kiedy złożyć dokumenty i ile wyniesie zasiłek. Zacznij od kilku pytań albo zaloguj się, żeby pobrać dane z ZUS.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/przewodnik" size="lg">Zacznij przewodnik <ArrowRight aria-hidden className="size-5" /></ButtonLink>
          <ButtonLink href="/logowanie" size="lg" variant="secondary">Zaloguj się (mObywatel)</ButtonLink>
        </div>
      </div>
    );
  }

  const r = outcome.ok ? outcome.result : null;
  const motherElig = r?.eligibility.find((e) => e.benefit === "maternity_any" && e.parent === "mother");
  const upcoming = r?.deadlines.filter((d) => !d.passed).slice(0, 4) ?? [];
  const importantRisks = r?.risks.filter((x) => x.level === "high" || x.level === "medium") ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy">
            {sensitive ? "Twoje świadczenia" : user ? `${user.firstName}, oto Twój plan` : "Mój plan rodzicielski"}
          </h1>
          <p className="mt-1 text-muted">
            {sensitive
              ? "Bardzo nam przykro. Poniżej spokojnie wyjaśniamy, co Ci przysługuje i jak to załatwić."
              : s.event === "pregnancy"
                ? `Przewidywany poród: ${s.dueDate ? dateLong(s.dueDate) : "—"}`
                : s.event === "birth"
                  ? `Data porodu: ${s.birthDate ? dateLong(s.birthDate) : "—"}`
                  : `Przyjęcie dziecka: ${s.placementDate ? dateLong(s.placementDate) : "—"}`}
          </p>
          {source === "zus" && <Badge tone="info" className="mt-2">Dane z ZUS (symulacja) · {insured.data ? `stan na ${dateShort(insured.data.asOf)}` : "pobieranie…"}</Badge>}
        </div>
        <ButtonLink href="/kalkulator" variant="secondary"><Pencil aria-hidden className="size-4" /> Zmień dane i plan</ButtonLink>
      </div>

      {sensitive && (
        <section className="mt-6" aria-labelledby="wsparcie">
          <h2 id="wsparcie" className="sr-only">Wsparcie</h2>
          <SupportOrgs filter="loss" compact />
        </section>
      )}

      {!outcome.ok && !outcome.pending && (
        <Callout tone="warning" className="mt-6" title="Nie możemy jeszcze policzyć planu">
          <ul className="list-disc pl-5">{outcome.issues.map((i) => <li key={i}>{i}</li>)}</ul>
          <button type="button" className="mt-2 font-bold text-primary underline" onClick={() => void refetch()}>Spróbuj ponownie</button>
        </Callout>
      )}
      {!r && outcome.ok === false && outcome.pending && <div className="mt-6 h-40 animate-pulse rounded-card bg-line/50" aria-label="Wczytywanie planu" />}

      {r && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="grid min-w-0 content-start gap-6">
            {/* Status ubezpieczenia — światła */}
            <Card>
              <CardHeader icon={<ShieldCheck className="size-6" />} title="Twoje ubezpieczenie chorobowe" description="Od niego zależy prawo do zasiłku macierzyńskiego." />
              <div className="px-5 pb-5">
                <div className={`flex items-start gap-3 rounded-ui p-4 ${motherElig?.status === "eligible" ? "bg-primary-50" : motherElig?.status === "at_risk" ? "bg-warning-50" : "bg-danger-50"}`}>
                  {motherElig?.status === "eligible" ? <CheckCircle2 aria-hidden className="mt-0.5 size-6 shrink-0 text-primary" /> : <CircleSlash aria-hidden className="mt-0.5 size-6 shrink-0 text-danger" />}
                  <div>
                    <p className="font-bold">
                      {motherElig?.status === "eligible" ? "Masz prawo do zasiłku macierzyńskiego" : motherElig?.status === "at_risk" ? "Prawo do zasiłku jest zagrożone" : "Zasiłek macierzyński nie przysługuje"}
                    </p>
                    <ul className="mt-1 text-sm">{motherElig?.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                </div>
                {insured.data && (
                  <ul className="mt-4 grid gap-2">
                    {insured.data.insurance.map((i) => (
                      <li key={i.payerNip + i.from} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-ui border border-line p-3 text-sm">
                        <Building2 aria-hidden className="size-4 text-muted" />
                        <span className="font-bold">{i.title}</span>
                        <span className="text-muted">{i.payerName}</span>
                        <span className="tabular">od {dateShort(i.from)}{i.to ? ` do ${dateShort(i.to)}` : ""}</span>
                        <Badge tone={i.sickness === "brak" ? "danger" : "success"}>chorobowe: {i.sickness}</Badge>
                        {i.payerInsuredCount !== null && <Badge tone="neutral">płatnik: {i.payerInsuredCount} os.</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            <SummaryStats result={r} labels={labels} />

            <Card>
              <CardHeader icon={<CalendarClock className="size-6" />} title={sensitive ? "Okres zasiłku" : "Kto i kiedy jest na zasiłku"} />
              <div className="px-5 pb-5"><Timeline segments={r.segments} labels={labels} /></div>
            </Card>

            {!sensitive && (
              <Card>
                <CardHeader title="Ile wpłynie w kolejnych miesiącach" description="Kwoty brutto. Netto zwykle o kilka procent mniej (zaliczka na podatek)." />
                <div className="px-5 pb-5"><MonthlyChart rows={r.monthly} labels={labels} /></div>
              </Card>
            )}

            <Card>
              <CardHeader icon={<FileText className="size-6" />} title="Dokumenty i gdzie je złożyć" />
              <div className="px-5 pb-5"><DocumentList docs={r.documents} labels={labels} /></div>
            </Card>
          </div>

          <aside className="grid min-w-0 content-start gap-6" aria-label="Najbliższe kroki">
            <Card className="border-2 border-primary">
              <CardHeader title="Co teraz zrobić" description="Najbliższe terminy" />
              <ol className="grid gap-3 px-5 pb-5">
                {upcoming.length === 0 && <li className="text-sm text-muted">Brak terminów w najbliższym czasie.</li>}
                {upcoming.map((d) => (
                  <li key={d.id} className="rounded-ui bg-canvas p-3">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold tabular text-primary-strong">
                      do {dateShort(d.date)}
                      <Badge tone="neutral">{labels[d.parent]}</Badge>
                    </p>
                    <p className="font-bold leading-snug">{d.title}</p>
                    <p className="text-sm text-muted">{d.description}</p>
                  </li>
                ))}
              </ol>
              <div className="px-5 pb-5">
                <ButtonLink href="/wnioski" className="w-full">Wypełnij wnioski <ArrowRight aria-hidden className="size-4" /></ButtonLink>
              </div>
            </Card>

            {importantRisks.length > 0 && (
              <Card>
                <CardHeader title="Na co uważać" />
                <div className="px-5 pb-5"><RiskList risks={importantRisks} /></div>
              </Card>
            )}

            {features.plainLanguage && <PlainLanguageCard result={r} labels={labels} />}

            <Card className="p-5">
              <p className="flex items-center gap-2 font-bold text-navy"><MessageCircleQuestion aria-hidden className="size-5 text-primary" /> Masz pytanie?</p>
              <p className="mt-1 text-sm text-muted">Zapytaj asystenta — zna Twój plan i odpowiada z odwołaniem do przepisów.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink href="/asystent" variant="secondary" size="sm">Zapytaj asystenta</ButtonLink>
                {user && <ButtonLink href="/konto" variant="ghost" size="sm">Napisz do ZUS (eZUS)</ButtonLink>}
              </div>
            </Card>

            {!sensitive && (
              <Link href="/wsparcie" className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 hover:border-primary">
                <HeartHandshake aria-hidden className="size-6 text-muted" />
                <span className="text-sm"><strong className="block text-navy">Wsparcie w trudnych sytuacjach</strong>Organizacje pomagające rodzicom wcześniaków, po stracie i przy chorobie dziecka.</span>
              </Link>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
