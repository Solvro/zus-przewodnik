import { FeatureGate } from "@/components/layout/feature-gate";
import type { Metadata } from "next";
import { AssistantView } from "./assistant-view";

export const metadata: Metadata = { title: "Asystent — zapytaj o zasiłki" };

export default function AsystentPage() {
  return (
    <FeatureGate feature="assistant">
      <AssistantView />
    </FeatureGate>
  );
}

// Przełącznik modułu sprawdzany przy każdym żądaniu
export const dynamic = "force-dynamic";
