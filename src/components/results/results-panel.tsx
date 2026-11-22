"use client";

import { useMemo } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { AlertCircle, Check, Loader2, RefreshCw } from "lucide-react";
import type { CalculationResult, Scenario } from "@/engine/types";
import { buildVariants, type CalcOutcome } from "@/lib/use-calculation";
import { useCalculateMany } from "@/lib/api/queries";
import { scenarioActions } from "@/lib/scenario-store";
import { cn, dateShort, zl } from "@/lib/utils";
import { Badge, Button, Callout } from "@/components/ui/primitives";
import { Timeline } from "./timeline";
import { MonthlyChart } from "./monthly-chart";
import { DeadlineList, DocumentList, EligibilityList, RiskList, SummaryStats, TraceList } from "./result-blocks";

export function parentLabels(s: Scenario) {
  const adoption = s.event === "adoption" || s.event === "foster";
  return adoption ? { mother: "Opiekun 1", father: "Opiekun 2" } : { mother: "Mama", father: "Tata" };
}

const TABS = [
  { id: "summary", label: "Podsumowanie" },
  { id: "timeline", label: "Oś czasu" },
  { id: "todo", label: "Co złożyć" },
  { id: "risks", label: "Ryzyka" },
  { id: "why", label: "Skąd te liczby" },
] as const;

export function ResultsPanel({
  scenario,
  outcome,
  stale,
  onRetry,
}: {
  scenario: Scenario;
  outcome: CalcOutcome;
  stale: boolean;
  onRetry?: () => void;
}) {
  const labels = parentLabels(scenario);
  if (!outcome.ok && outcome.pending) return <ResultsSkeleton />;
  if (!outcome.ok) {
    return (
      <Callout tone="warning" icon={<AlertCircle className="size-5" />} title="Uzupełnij dane, aby zobaczyć wynik">
        <ul className="list-disc pl-5">
          {outcome.issues.slice(0, 5).map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        {onRetry && (
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            <RefreshCw aria-hidden className="size-4" /> Spróbuj ponownie
          </Button>
        )}
      </Callout>
    );
  }
  const r = outcome.result;
  const highRisks = r.risks.filter((x) => x.level === "high").length;

  return (
    <div className={cn("transition-opacity", stale && "opacity-60")} aria-busy={stale}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-black text-navy">Wynik dla Twojej sytuacji</h2>
        <span className="flex items-center gap-1.5 text-sm text-muted" role="status" aria-live="polite">
          {stale ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" /> Przeliczam…
            </>
          ) : (
            <>
              <Check aria-hidden className="size-4 text-primary" /> Aktualne
            </>
          )}
        </span>
      </div>

      {r.validation.length > 0 && (
        <Callout tone="warning" className="mb-4" title="Dopasowaliśmy plan do przepisów">
          <ul className="list-disc pl-5">
            {r.validation.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </Callout>
      )}

      <SummaryStats result={r} labels={labels} />

      <Tabs.Root defaultValue="summary" className="mt-6">
        <Tabs.List aria-label="Szczegóły wyniku" className="-mx-1 flex gap-1 overflow-x-auto border-b-2 border-line px-1 pb-px">
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.id}
              value={t.id}
              className="relative min-h-11 shrink-0 whitespace-nowrap rounded-t-ui px-3 font-bold text-muted hover:text-ink data-[state=active]:text-primary-strong data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-[2px] data-[state=active]:after:h-[3px] data-[state=active]:after:bg-primary"
            >
              {t.label}
              {t.id === "risks" && highRisks > 0 && (
                <Badge tone="danger" className="ml-1.5">
                  {highRisks}
                  <span className="sr-only"> ważne</span>
                </Badge>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="summary" className="pt-5 outline-none">
          <EligibilityList items={r.eligibility} />
          {r.segments.some((s) => ["maternity", "adoption_maternity"].includes(s.kind)) && !scenario.loss && (
            <VariantCompare scenario={scenario} current={r} />
          )}
        </Tabs.Content>
        <Tabs.Content value="timeline" className="grid gap-8 pt-5 outline-none">
          <div>
            <h3 className="mb-3 font-bold text-navy">Kto i kiedy jest na zasiłku</h3>
            <Timeline segments={r.segments} labels={labels} />
          </div>
          <div>
            <h3 className="mb-3 font-bold text-navy">Ile wpłynie w każdym miesiącu (brutto)</h3>
            <MonthlyChart rows={r.monthly} labels={labels} />
          </div>
        </Tabs.Content>
        <Tabs.Content value="todo" className="grid gap-8 pt-5 outline-none">
          <PayerInfo r={r} labels={labels} />
          <div>
            <h3 className="mb-3 font-bold text-navy">Terminy</h3>
            <DeadlineList deadlines={r.deadlines} labels={labels} />
          </div>
          <div>
            <h3 className="mb-3 font-bold text-navy">Dokumenty</h3>
            <DocumentList docs={r.documents} labels={labels} />
          </div>
        </Tabs.Content>
        <Tabs.Content value="risks" className="pt-5 outline-none">
          <RiskList risks={r.risks} />
        </Tabs.Content>
        <Tabs.Content value="why" className="pt-5 outline-none">
          <p className="mb-3 text-sm text-muted">
            Każdy krok obliczenia z podstawą prawną. Parametry: <strong>{r.paramsId}</strong>. Kwoty brutto; zasiłek za dzień to 1/30 kwoty miesięcznej.
          </p>
          <TraceList trace={r.trace} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function PayerInfo({ r, labels }: { r: CalculationResult; labels: { mother: string; father: string } }) {
  return (
    <div>
      <h3 className="mb-3 font-bold text-navy">Kto wypłaci zasiłek</h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {(["mother", "father"] as const).map((w) =>
          r.payer[w] ? (
            <li key={w} className="rounded-ui border border-line bg-surface p-4">
              <p className="text-sm font-bold text-muted">{labels[w]}</p>
              <p className="text-lg font-black text-navy">
                {r.payer[w]!.who === "payer" ? "Pracodawca / zleceniodawca" : r.payer[w]!.who === "zus" ? "ZUS" : "Zależy od płatnika"}
              </p>
              <p className="mt-1 text-sm">{r.payer[w]!.reason}</p>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}

function VariantCompare({ scenario, current }: { scenario: Scenario; current: CalculationResult }) {
  const variants = useMemo(() => buildVariants(scenario), [scenario]);
  const queries = useCalculateMany(variants.map((v) => v.scenario));
  const ok = variants.flatMap((v, i) => (queries[i]?.data ? [{ ...v, outcome: { ok: true as const, result: queries[i].data! } }] : []));
  if (queries.some((q) => q.isPending)) {
    return (
      <div className="mt-8 grid gap-3 md:grid-cols-3" aria-label="Wczytywanie wariantów">
        {variants.map((v) => (
          <div key={v.id} className="h-48 animate-pulse rounded-ui bg-line/60" />
        ))}
      </div>
    );
  }
  if (ok.length < 2) return null;
  const best = Math.max(...ok.map((v) => v.outcome.result.totals.all));
  const labels = parentLabels(scenario);

  return (
    <section className="mt-8" aria-labelledby="variants">
      <h3 id="variants" className="font-bold text-navy">Porównaj warianty</h3>
      <p className="text-sm text-muted">Te same dane, inne decyzje. Wybierz wariant, aby zastosować go do planu.</p>
      <ul className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-3">
        {ok.map((v) => {
          const r = v.outcome.result;
          const mat = r.segments.find((x) => x.parent === "mother" && ["maternity", "adoption_maternity"].includes(x.kind));
          const par = r.segments.find((x) => x.parent === "mother" && x.kind === "parental");
          const isCurrent =
            !!scenario.plan?.averaged === !!v.scenario.plan?.averaged &&
            (scenario.plan?.parentalFatherWeeks ?? 0) === (v.scenario.plan?.parentalFatherWeeks ?? 0);
          return (
            <li key={v.id} className={cn("flex flex-col rounded-ui border-2 bg-surface p-4", isCurrent ? "border-primary" : "border-line")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-bold">{v.label}</p>
                {r.totals.all === best && <Badge tone="success">najwięcej</Badge>}
              </div>
              <p className="font-display mt-2 text-3xl tabular text-navy">{zl(r.totals.all)}</p>
              <dl className="mt-2 grid gap-2 text-sm">
                <div><dt className="text-xs text-muted">Macierzyński miesięcznie</dt><dd className="font-bold tabular">{mat ? zl(mat.monthlyAmount) : "—"}</dd></div>
                <div><dt className="text-xs text-muted">Rodzicielski miesięcznie</dt><dd className="font-bold tabular">{par ? zl(par.monthlyAmount) : "—"}</dd></div>
                <div><dt className="text-xs text-muted">{labels.mother} wraca do pracy</dt><dd className="font-bold tabular">{r.returnToWork.mother ? dateShort(r.returnToWork.mother) : "—"}</dd></div>
              </dl>
              <div className="mt-auto pt-3">
                {isCurrent ? (
                  <Badge tone="success">Wybrany</Badge>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => scenarioActions.setPlan({ averaged: v.scenario.plan?.averaged, parentalFatherWeeks: v.scenario.plan?.parentalFatherWeeks, parentalMotherWeeks: undefined })}
                  >
                    Wybierz
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">Aktualny wynik: {zl(current.totals.all)} brutto.</p>
    </section>
  );
}

/** Szkielet zamiast pustego ekranu przy pierwszym wczytaniu (progressive-loading). */
function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Wczytywanie wyniku" className="grid gap-4">
      <div className="h-7 w-64 animate-pulse rounded bg-line/70" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-ui bg-line/60" />
        ))}
      </div>
      <div className="h-11 animate-pulse rounded bg-line/50" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-ui bg-line/40" />
      ))}
    </div>
  );
}
