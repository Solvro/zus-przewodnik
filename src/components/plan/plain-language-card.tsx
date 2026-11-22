"use client";

import { Loader2, Wand2 } from "lucide-react";
import type { CalculationResult } from "@/engine/types";
import { usePlainLanguageMutation } from "@/lib/api/queries";
import { dateShort, zl } from "@/lib/utils";
import { AiBadge, Button, Callout, Card } from "@/components/ui/primitives";

/** Deterministyczne podsumowanie planu → AI przepisuje je na prosty język (bez zmiany faktów). */
function summarize(r: CalculationResult, labels: { mother: string; father: string }) {
  return [
    ...r.eligibility.map((e) => `${e.title}: ${e.status === "eligible" ? "przysługuje" : e.status === "not_eligible" ? "nie przysługuje" : "zagrożone"}. ${e.reasons.join(" ")}`),
    ...r.segments.map((s) => `${labels[s.parent]}: ${s.label} od ${dateShort(s.start)} do ${dateShort(s.end)}, ${zl(s.monthlyAmount)} miesięcznie brutto.`),
    ...r.deadlines.filter((d) => !d.passed).slice(0, 4).map((d) => `Termin ${dateShort(d.date)}: ${d.title}. ${d.description}`),
    ...r.risks.filter((x) => x.level === "high" || x.level === "medium").map((x) => `Uwaga: ${x.title}. ${x.description}`),
  ].join("\n");
}

export function PlainLanguageCard({ result, labels }: { result: CalculationResult; labels: { mother: string; father: string } }) {
  const m = usePlainLanguageMutation();
  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 font-bold text-navy"><Wand2 aria-hidden className="size-5 text-primary" /> Wyjaśnij prostym językiem <AiBadge /></p>
      <p className="mt-1 text-sm text-muted">Krótkie podsumowanie Twojego planu bez urzędowego języka.</p>
      {m.data ? (
        <div className="mt-3 whitespace-pre-wrap rounded-ui bg-primary-50 p-3 text-sm">{m.data.text}</div>
      ) : m.isError ? (
        <Callout tone="warning" className="mt-3" title="Funkcja chwilowo niedostępna">{m.error.message}</Callout>
      ) : null}
      <Button variant="secondary" size="sm" className="mt-3" onClick={() => m.mutate(summarize(result, labels))} disabled={m.isPending}>
        {m.isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Wand2 aria-hidden className="size-4" />}
        {m.data ? "Wyjaśnij jeszcze raz" : "Wyjaśnij mój plan"}
      </Button>
    </Card>
  );
}
