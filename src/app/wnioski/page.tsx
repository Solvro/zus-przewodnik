import { FeatureGate } from "@/components/layout/feature-gate";
import type { Metadata } from "next";
import { FormsList } from "./forms-list";

export const metadata: Metadata = { title: "Wnioski o urlopy i zasiłki" };

export default function WnioskiPage() {
  return (
    <FeatureGate feature="applications">
      <FormsList />
    </FeatureGate>
  );
}

// Przełącznik modułu sprawdzany przy każdym żądaniu
export const dynamic = "force-dynamic";
