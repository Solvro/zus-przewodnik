"use client";

import { useEffect } from "react";
import { rehydrateScenario, useScenarioHydrated } from "@/lib/scenario-store";

/**
 * Scenariusz żyje w sessionStorage, a jego domyślne daty zależą od „dziś” — serwer (proces działający
 * od wielu dni) i przeglądarka policzyłyby je inaczej. Widoki zależne od scenariusza renderujemy więc
 * dopiero po wczytaniu danych w przeglądarce; wcześniej szkielet (bez rozjazdu hydratacji).
 */
export function ScenarioGate({ children, skeletonClassName = "mx-auto mt-10 h-96 max-w-5xl" }: { children: React.ReactNode; skeletonClassName?: string }) {
  useEffect(rehydrateScenario, []);
  const hydrated = useScenarioHydrated();
  if (!hydrated) {
    return (
      <div role="status" className={`${skeletonClassName} animate-pulse rounded-card bg-line/50 motion-reduce:animate-none`}>
        <span className="sr-only">Wczytywanie…</span>
      </div>
    );
  }
  return <>{children}</>;
}
