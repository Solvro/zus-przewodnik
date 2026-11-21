"use client";

import { useEffect } from "react";
import { ChevronDown, FileUp, RotateCcw } from "lucide-react";
import { rehydrateScenario, scenarioActions, useScenario, useScenarioSource } from "@/lib/scenario-store";
import { useCalculation } from "@/lib/use-calculation";
import { zl } from "@/lib/utils";
import { Badge, Button, ButtonLink } from "@/components/ui/primitives";
import { ResultsPanel } from "@/components/results/results-panel";
import { ParentSection, PlanSection, SituationSection } from "./scenario-form";

const SOURCE_LABEL = { manual: null, zus: "Dane pobrane z ZUS (symulacja)", documents: "Dane odczytane z dokumentów sprawy" } as const;

/** Zintegrowany kalkulator (wymóg R10): wszystkie scenariusze w jednym miejscu, wynik obok formularza. */
export function CalculatorView() {
  useEffect(rehydrateScenario, []);
  const s = useScenario();
  const source = useScenarioSource();
  const { outcome, stale, refetch } = useCalculation(s);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy">Kalkulator zasiłku</h1>
          <p className="prose-zus mt-1 text-muted">
            Macierzyński, rodzicielski, ojcowski i uzupełniający — dla obojga rodziców, przy adopcji i w rodzinie zastępczej. Wynik przelicza się na bieżąco.
          </p>
          {SOURCE_LABEL[source] && <Badge tone="info" className="mt-2">{SOURCE_LABEL[source]}</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/kalkulator/sprawa" variant="secondary">
            <FileUp aria-hidden className="size-4" /> Wczytaj dokumenty sprawy
          </ButtonLink>
          <Button type="button" variant="ghost" onClick={() => scenarioActions.reset()}>
            <RotateCcw aria-hidden className="size-4" /> Wyczyść
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <form className="grid min-w-0 content-start gap-5" onSubmit={(e) => e.preventDefault()} aria-label="Dane do obliczeń">
          <SituationSection s={s} />
          <ParentSection s={s} who="mother" step={2} />
          <ParentSection s={s} who="father" step={3} />
          <PlanSection s={s} step={4} />
        </form>
        <div id="wynik" className="min-w-0 scroll-mt-20">
          <div>
            <ResultsPanel scenario={s} outcome={outcome} stale={stale} onRetry={() => void refetch()} />
          </div>
        </div>
      </div>

      {/* Pasek wyniku na telefonie — suma zawsze widoczna nad dolną nawigacją */}
      {outcome.ok && (
        <a
          href="#wynik"
          className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex min-h-12 items-center justify-between rounded-ui bg-navy px-4 text-white shadow-lg lg:hidden"
        >
          <span className="text-sm">Razem brutto</span>
          <span className="flex items-center gap-2 font-black tabular">
            {zl(outcome.result.totals.all)}
            <ChevronDown aria-hidden className="size-5" />
          </span>
        </a>
      )}
    </div>
  );
}
