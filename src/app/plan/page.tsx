import type { Metadata } from "next";
import { PlanView } from "./plan-view";
import { ScenarioGate } from "@/components/layout/scenario-gate";

export const metadata: Metadata = { title: "Mój plan rodzicielski" };

export default function PlanPage() {
  return (
    <ScenarioGate>
      <PlanView />
    </ScenarioGate>
  );
}
