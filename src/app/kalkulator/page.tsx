import type { Metadata } from "next";
import { CalculatorView } from "@/components/calculator/calculator-view";
import { ScenarioGate } from "@/components/layout/scenario-gate";

export const metadata: Metadata = {
  title: "Kalkulator zasiłku macierzyńskiego",
};

export default function KalkulatorPage() {
  return (
    <ScenarioGate>
      <CalculatorView />
    </ScenarioGate>
  );
}
