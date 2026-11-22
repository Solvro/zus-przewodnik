import { FeatureGate } from "@/components/layout/feature-gate";
import type { Metadata } from "next";
import { AccountView } from "./account-view";
import { ScenarioGate } from "@/components/layout/scenario-gate";

export const metadata: Metadata = { title: "Moje konto (eZUS — symulacja)" };

export default function KontoPage() {
  return (
    <FeatureGate feature="account">
      <ScenarioGate>
        <AccountView />
      </ScenarioGate>
    </FeatureGate>
  );
}

// Przełącznik modułu sprawdzany przy każdym żądaniu
export const dynamic = "force-dynamic";
