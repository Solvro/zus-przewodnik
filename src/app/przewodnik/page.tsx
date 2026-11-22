import type { Metadata } from "next";
import { Suspense } from "react";
import { Wizard } from "./wizard";
import { ScenarioGate } from "@/components/layout/scenario-gate";

export const metadata: Metadata = { title: "Przewodnik — sprawdź swoje świadczenia" };

export default function PrzewodnikPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* useSearchParams wymaga granicy Suspense (async-suspense-boundaries) */}
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-line/50" aria-label="Wczytywanie" />}>
        <ScenarioGate skeletonClassName="h-96">
          <Wizard />
        </ScenarioGate>
      </Suspense>
    </div>
  );
}
