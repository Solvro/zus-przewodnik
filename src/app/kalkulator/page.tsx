import type { Metadata } from "next";
import { CalculatorView } from "@/components/calculator/calculator-view";
import { ScenarioGate } from "@/components/layout/scenario-gate";

export const metadata: Metadata = {
  title: "Kalkulator zasiłku macierzyńskiego",
  description:
    "Jeden kalkulator dla obojga rodziców: macierzyński, rodzicielski, ojcowski, uzupełniający, adopcja, rodzina zastępcza, praca na część etatu i wariant 81,5%.",
};

export default function KalkulatorPage() {
  return (
    <ScenarioGate>
      <CalculatorView />
    </ScenarioGate>
  );
}
