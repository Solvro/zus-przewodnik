import { FeatureGate } from "@/components/layout/feature-gate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findForm } from "@/content/forms";
import { FormEditorView } from "./form-editor";
import { ScenarioGate } from "@/components/layout/scenario-gate";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: findForm(code)?.short ?? "Wniosek" };
}

export default async function FormPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!findForm(code)) notFound();
  return (
    <FeatureGate feature="applications">
      <ScenarioGate>
        <FormEditorView code={code} />
      </ScenarioGate>
    </FeatureGate>
  );
}
