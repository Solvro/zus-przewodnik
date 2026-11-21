"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { api } from "@/lib/api/client";
import { mockKeys, useLoginMutation, usePersonasQuery, type InsuredResponse } from "@/lib/api/queries";
import { sessionActions } from "@/lib/session";
import { scenarioActions } from "@/lib/scenario-store";
import { Badge, Button, ButtonLink, Callout, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/** Symulacja logowania przez mObywatel (S1) i pobrania danych z ZUS (S2). */
export function LoginFlow() {
  const router = useRouter();
  const qc = useQueryClient();
  const personas = usePersonasQuery();
  const login = useLoginMutation();
  const [picked, setPicked] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "confirm" | "fetching">("pick");
  const [code] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));

  async function confirm() {
    if (!picked) return;
    const res = await login.mutateAsync(picked);
    sessionActions.login(res.user);
    setStep("fetching");
    const insured = await qc.fetchQuery({
      queryKey: mockKeys.insured(picked),
      queryFn: () => api<InsuredResponse>(`/api/v1/mock/zus/insured/${picked}`),
    });
    scenarioActions.replace(insured.scenario, "zus");
    router.push("/plan");
  }

  return (
    <div>
      <h1 className="text-3xl font-black text-navy">Zaloguj się</h1>
      <p className="prose-zus mt-2 text-muted">
        Po zalogowaniu pobierzemy z ZUS informację o Twoim ubezpieczeniu i przygotujemy plan. To symulacja — wybierz jedną z fikcyjnych osób demonstracyjnych.
      </p>

      {step === "pick" && (
        <Card className="mt-6 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck aria-hidden className="size-7 text-primary" />
            <div>
              <h2 className="font-bold text-navy">Logowanie przez mObywatel</h2>
              <p className="text-sm text-muted">Symulacja — w wdrożeniu przez login.gov.pl (Węzeł Krajowy).</p>
            </div>
            <Badge tone="accent" className="ml-auto">demo</Badge>
          </div>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-bold">Wybierz osobę demonstracyjną</legend>
            {personas.isPending && (
              <div className="grid gap-2" aria-label="Wczytywanie">
                {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-ui bg-line/60" />)}
              </div>
            )}
            {personas.isError && (
              <Callout tone="danger" title="Nie udało się wczytać listy">
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => personas.refetch()}>Spróbuj ponownie</Button>
              </Callout>
            )}
            <ul className="grid gap-2 sm:grid-cols-2">
              {personas.data?.map((p) => (
                <li key={p.id}>
                  <label
                    className={cn(
                      "flex h-full cursor-pointer gap-3 rounded-ui border-2 p-3 transition-colors",
                      picked === p.id ? "border-primary bg-primary-50" : "border-line hover:border-muted",
                    )}
                  >
                    <input type="radio" name="persona" value={p.id} checked={picked === p.id} onChange={() => setPicked(p.id)} className="mt-1 size-4 accent-[var(--c-primary)]" />
                    <span className="min-w-0">
                      <span className="block font-bold">{p.firstName} {p.lastName}</span>
                      <span className="block text-sm text-muted">{p.headline}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {p.tags.slice(0, 3).map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" disabled={!picked} onClick={() => setStep("confirm")}>Dalej</Button>
            <ButtonLink href="/przewodnik" variant="link">Kontynuuj bez logowania</ButtonLink>
          </div>
        </Card>
      )}

      {step === "confirm" && (
        <Card className="mt-6 p-6 text-center">
          <Smartphone aria-hidden className="mx-auto size-10 text-primary" />
          <h2 className="mt-3 text-xl font-bold text-navy">Potwierdź logowanie w aplikacji mObywatel</h2>
          <p className="mt-1 text-muted">Sprawdź, czy w aplikacji widzisz ten sam kod:</p>
          <p className="mt-4 text-5xl font-black tracking-[0.3em] tabular text-navy" aria-label={`Kod ${code.split("").join(" ")}`}>{code}</p>
          {login.isError && (
            <Callout tone="danger" className="mt-4 text-left" title="Logowanie nie powiodło się">
              {login.error.message} — spróbuj ponownie.
            </Callout>
          )}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="ghost" onClick={() => setStep("pick")} disabled={login.isPending}>
              <ArrowLeft aria-hidden className="size-4" /> Wróć
            </Button>
            <Button size="lg" onClick={() => void confirm()} disabled={login.isPending}>
              {login.isPending ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <CheckCircle2 aria-hidden className="size-5" />}
              {login.isPending ? "Łączenie…" : "Potwierdzam w aplikacji (symulacja)"}
            </Button>
          </div>
        </Card>
      )}

      {step === "fetching" && (
        <Card className="mt-6 p-6 text-center" role="status" aria-live="polite">
          <Loader2 aria-hidden className="mx-auto size-10 animate-spin text-primary" />
          <h2 className="mt-3 text-xl font-bold text-navy">Pobieramy dane z ZUS…</h2>
          <p className="mt-1 text-muted">Ubezpieczenie, płatnik, podstawa składek i zwolnienia lekarskie (symulacja).</p>
        </Card>
      )}
    </div>
  );
}
