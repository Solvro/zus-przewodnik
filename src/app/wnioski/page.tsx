import { FeatureGate } from "@/components/layout/feature-gate";
import type { Metadata } from "next";
import { FormsList } from "./forms-list";
import { ScenarioGate } from "@/components/layout/scenario-gate";

export const metadata: Metadata = { title: "Wnioski o urlopy i zasiłki" };

export default function WnioskiPage() {
  return (
    <FeatureGate feature="applications">
      <ScenarioGate>
        <FormsList />
      </ScenarioGate>
    </FeatureGate>
  );
}

// Przełącznik modułu sprawdzany przy każdym żądaniu
export const dynamic = "force-dynamic";
