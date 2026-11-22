import { FeatureGate } from "@/components/layout/feature-gate";
import type { Metadata } from "next";
import { CaseView } from "./case-view";

export const metadata: Metadata = { title: "Sprawa ZUS — test na dokumentach" };

export default function SprawaPage() {
  return (
    <FeatureGate feature="documentUpload">
      <CaseView />
    </FeatureGate>
  );
}

// Przełącznik modułu sprawdzany przy każdym żądaniu
export const dynamic = "force-dynamic";
