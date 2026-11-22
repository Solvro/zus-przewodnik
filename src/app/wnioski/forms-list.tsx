"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Sparkles } from "lucide-react";
import { FORMS } from "@/content/forms";
import { rehydrateScenario, useScenario } from "@/lib/scenario-store";
import { rehydrateSession, useSession } from "@/lib/session";
import { useCalculation } from "@/lib/use-calculation";
import { Badge } from "@/components/ui/primitives";

const TO_LABEL = { employer: "do pracodawcy", zus: "do ZUS", "payer-or-zus": "do płatnika lub ZUS" } as const;

export function FormsList() {
  useEffect(() => {
    rehydrateScenario();
    rehydrateSession();
  }, []);
  const s = useScenario();
  const { user } = useSession();
  const { outcome } = useCalculation(s);
  const ctx = { s, r: outcome.ok ? outcome.result : undefined, user };
  const recommended = FORMS.filter((f) => f.relevant(ctx));
  const others = FORMS.filter((f) => !f.relevant(ctx));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black text-navy">Wnioski</h1>
      <p className="prose-zus mt-2 text-muted">
        Wypełniamy wnioski danymi z Twojego planu. Sprawdź je, pobierz jako PDF albo wyślij od razu do pracodawcy lub ZUS (symulacja).
      </p>

      <section className="mt-8" aria-labelledby="rec">
        <h2 id="rec" className="flex items-center gap-2 text-xl font-bold text-navy">
          <Sparkles aria-hidden className="size-5 text-primary" /> Dla Twojej sytuacji
        </h2>
        {recommended.length === 0 ? (
          <p className="mt-3 text-muted">
            {outcome.ok ? "W tym scenariuszu nie trzeba składać osobnych wniosków — wystarczą dokumenty z planu." : "Uzupełnij plan, aby zobaczyć rekomendowane wnioski."}
          </p>
        ) : (
          <FormCards forms={recommended} highlight />
        )}
      </section>

      <section className="mt-10" aria-labelledby="all">
        <h2 id="all" className="text-xl font-bold text-navy">Pozostałe wnioski</h2>
        <FormCards forms={others} />
      </section>
    </div>
  );
}

function FormCards({ forms, highlight = false }: { forms: typeof FORMS; highlight?: boolean }) {
  return (
    <ul className="mt-3 grid gap-3">
      {forms.map((f) => (
        <li key={f.code}>
          <Link href={`/wnioski/${f.code}`} className={`flex items-center gap-4 rounded-card border-2 bg-surface p-4 hover:border-primary ${highlight ? "border-primary-200" : "border-line"}`}>
            <FileText aria-hidden className="size-6 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-navy">{f.short}</span>
              <span className="mt-0.5 flex flex-wrap gap-1.5">
                <Badge tone="neutral">{TO_LABEL[f.to]}</Badge>
                {f.deadline && <Badge tone="warning">{f.deadline}</Badge>}
              </span>
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
