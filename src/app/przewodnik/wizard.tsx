"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Baby, Briefcase, Building2, CalendarHeart, Check, FileSignature, HeartHandshake, UserX, Users } from "lucide-react";
import type { Scenario } from "@/engine/types";
import { addDays, todayIso } from "@/engine/dates";
import { emptyParent, rehydrateScenario, scenarioActions, useScenario, useScenarioHydrated, type ParentDraft } from "@/lib/scenario-store";
import { Button, ButtonLink, Callout, ChoiceGroup, Field, Input, Toggle } from "@/components/ui/primitives";
import { NumberInput } from "@/components/ui/number-input";
import { Term } from "@/components/ui/term";

const SITUATION_MAP: Record<string, Scenario["event"]> = {
  ciaza: "pregnancy",
  urodzenie: "birth",
  adopcja: "adoption",
};

type StepId = "event" | "dates" | "children" | "work" | "salary" | "partner" | "plan";
const STEPS: { id: StepId; title: string }[] = [
  { id: "event", title: "Sytuacja" },
  { id: "dates", title: "Daty" },
  { id: "children", title: "Dziecko" },
  { id: "work", title: "Praca" },
  { id: "salary", title: "Zarobki" },
  { id: "partner", title: "Drugi rodzic" },
  { id: "plan", title: "Plan" },
];

export function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const s = useScenario();
  const hydrated = useScenarioHydrated();
  const [i, setI] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const preset = SITUATION_MAP[params.get("sytuacja") ?? ""];

  useEffect(rehydrateScenario, []);
  // Ustawienie sytuacji z linku na stronie głównej (raz, po nawodnieniu stanu)
  const applied = useRef(false);
  useEffect(() => {
    if (!hydrated || applied.current || !preset) return;
    applied.current = true;
    if (s.event !== preset) applyEvent(preset);
    setI(1);
  }, [hydrated, preset, s.event]);

  const step = STEPS[i];
  const isAdoption = s.event === "adoption" || s.event === "foster";
  const mother = s.mother as ParentDraft;

  function go(delta: number) {
    const next = Math.min(Math.max(i + delta, 0), STEPS.length - 1);
    setI(next);
    // focus-management: po zmianie kroku fokus na nagłówek pytania
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function finish() {
    scenarioActions.touch();
    router.push("/plan");
  }

  const missing = stepMissing(step.id, s);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted">
          Krok {i + 1} z {STEPS.length} · {step.title}
        </p>
        <ButtonLink href="/" variant="link" className="text-sm">Przerwij</ButtonLink>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Postęp przewodnika" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={i + 1}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
      </div>

      <form
        className="mt-6 rounded-card border border-line bg-surface p-5 shadow-card sm:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (missing) return;
          if (i === STEPS.length - 1) finish();
          else go(1);
        }}
      >
        {step.id === "event" && (
          <Q title="Co się u Was dzieje?" ref={headingRef}>
            <ChoiceGroup
              name="w-event"
              legend={<span className="sr-only">Sytuacja</span>}
              value={s.event}
              onChange={applyEvent}
              columns={1}
              options={[
                { value: "pregnancy", label: "Jestem w ciąży", description: "Zwolnienia, urlop przed porodem i plan na później", icon: <CalendarHeart className="size-5" /> },
                { value: "birth", label: "Dziecko się urodziło", description: "albo urodzi się lada dzień", icon: <Baby className="size-5" /> },
                { value: "adoption", label: "Przysposabiamy dziecko", description: "wystąpiliśmy do sądu o adopcję", icon: <Users className="size-5" /> },
                { value: "foster", label: "Jesteśmy rodziną zastępczą niezawodową", icon: <HeartHandshake className="size-5" /> },
              ]}
            />
          </Q>
        )}

        {step.id === "dates" && (
          <Q title={isAdoption ? "Kiedy dziecko trafi do Was i ile ma lat?" : s.event === "pregnancy" ? "Kiedy jest termin porodu?" : "Kiedy urodziło się dziecko?"} ref={headingRef}>
            {isAdoption ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Data przyjęcia dziecka" htmlFor="w-placement">
                  <Input id="w-placement" type="date" value={s.placementDate ?? ""} onChange={(e) => scenarioActions.set({ placementDate: e.target.value })} />
                </Field>
                <Field label="Data urodzenia dziecka" htmlFor="w-childbirth">
                  <Input id="w-childbirth" type="date" value={s.childBirthDate ?? ""} onChange={(e) => scenarioActions.set({ childBirthDate: e.target.value })} />
                </Field>
              </div>
            ) : (
              <Field label={s.event === "pregnancy" ? "Przewidywana data porodu" : "Data porodu"} htmlFor="w-date" hint="Wystarczy przybliżona — potem łatwo zmienisz.">
                <Input
                  id="w-date"
                  type="date"
                  value={(s.event === "pregnancy" ? s.dueDate : s.birthDate) ?? ""}
                  onChange={(e) => scenarioActions.set(s.event === "pregnancy" ? { dueDate: e.target.value } : { birthDate: e.target.value, dueDate: e.target.value })}
                />
              </Field>
            )}
          </Q>
        )}

        {step.id === "children" && (
          <Q title={isAdoption ? "Ile dzieci przyjmujecie?" : "Ile dzieci przy jednym porodzie?"} ref={headingRef}>
            <ChoiceGroup
              name="w-children"
              legend={<span className="sr-only">Liczba dzieci</span>}
              value={String(s.childrenCount ?? 1)}
              onChange={(v) => scenarioActions.set({ childrenCount: Number(v) })}
              columns={3}
              options={[
                { value: "1", label: "Jedno" },
                { value: "2", label: "Bliźnięta" },
                { value: "3", label: "Troje lub więcej" },
              ]}
            />
            <div className="mt-5 grid gap-4">
              <Toggle id="w-zz" checked={!!s.zaZyciem} onChange={(v) => scenarioActions.set({ zaZyciem: v })} label={<>Jest zaświadczenie <Term id="za-zyciem">„Za życiem”</Term></>} description="Ciężka, nieodwracalna choroba lub upośledzenie dziecka." />
              {s.event === "birth" && (
                <Toggle id="w-prem" checked={!!s.premature} onChange={(v) => scenarioActions.set({ premature: v ? { gestationWeek: 32, birthWeightG: 1600, hospitalDays: 21 } : undefined })} label="Wcześniak lub pobyt w szpitalu po porodzie" description="Szczegóły uzupełnisz w kalkulatorze." />
              )}
            </div>
          </Q>
        )}

        {step.id === "work" && (
          <Q title={isAdoption ? "Jak pracuje opiekun przyjmujący dziecko?" : "Jak pracuje mama?"} ref={headingRef}>
            <ChoiceGroup
              name="w-title"
              legend={<span className="sr-only">Forma pracy</span>}
              value={mother.title}
              onChange={(t) => scenarioActions.setParent("mother", emptyParent(t))}
              columns={2}
              options={[
                { value: "employment", label: "Umowa o pracę", icon: <Briefcase className="size-5" /> },
                { value: "mandate", label: "Umowa zlecenie", icon: <FileSignature className="size-5" /> },
                { value: "business", label: "Własna działalność", icon: <Building2 className="size-5" /> },
                { value: "none", label: "Nie pracuję", icon: <UserX className="size-5" /> },
              ]}
            />
            {(mother.title === "mandate" || mother.title === "business") && (
              <div className="mt-5">
                <Toggle id="w-vol" checked={!!mother.voluntarySickness} onChange={(v) => scenarioActions.setParent("mother", { voluntarySickness: v })} label="Opłaca dobrowolne ubezpieczenie chorobowe" description="Bez niego zasiłek macierzyński nie przysługuje." />
              </div>
            )}
            {mother.title === "employment" || mother.title === "mandate" ? (
              <div className="mt-5">
                <ChoiceGroup
                  name="w-payer"
                  legend={<>Ile osób zgłasza do ubezpieczenia <Term id="platnik">płatnik</Term> {isAdoption ? "opiekuna" : "mamy"}?</>}
                  value={mother.payerInsuredCount === undefined ? "unknown" : mother.payerInsuredCount > 20 ? "large" : "small"}
                  onChange={(v) => scenarioActions.setParent("mother", { payerInsuredCount: v === "unknown" ? undefined : v === "large" ? 50 : 10 })}
                  columns={3}
                  options={[
                    { value: "small", label: "20 lub mniej" },
                    { value: "large", label: "Ponad 20" },
                    { value: "unknown", label: "Nie wiem" },
                  ]}
                />
              </div>
            ) : null}
            {mother.title === "none" && (
              <Callout tone="info" className="mt-5" title="Bez ubezpieczenia zasiłek z ZUS mamie nie przysługuje">
                Ale drugi rodzic może mieć prawo do urlopu ojcowskiego i rodzicielskiego — zapytamy o niego za chwilę. Sprawdź też świadczenie rodzicielskie w gminie.
              </Callout>
            )}
          </Q>
        )}

        {step.id === "salary" && (
          <Q title={mother.title === "business" ? (isAdoption ? "Od jakiej podstawy opiekun płaci składkę chorobową?" : "Od jakiej podstawy mama płaci składkę chorobową?") : isAdoption ? "Ile zarabia opiekun brutto miesięcznie?" : "Ile zarabia mama brutto miesięcznie?"} ref={headingRef}>
            {mother.title === "none" ? (
              <p className="text-muted">Pomijamy — przejdź dalej.</p>
            ) : mother.title === "business" ? (
              <Field label="Deklarowana podstawa" htmlFor="w-decl" hint="Najczęściej 5 652 zł w 2026 r.">
                <NumberInput
                  id="w-decl"
                  value={mother.basis?.mode === "declared" ? mother.basis.monthlyBases[0] : 5652}
                  min={0}
                  onChange={(v) => v !== undefined && scenarioActions.setParent("mother", { basis: { mode: "declared", monthlyBases: Array(12).fill(v), minBaseType: "standard" } })}
                  suffix="zł"
                />
              </Field>
            ) : (
              <Field label="Średnio z ostatnich 12 miesięcy, z premiami" htmlFor="w-gross" hint="To wystarczy do szacunku. Dokładną kwotę policzymy z zaświadczenia Z-3.">
                <NumberInput id="w-gross" value={mother.basis?.mode === "gross" ? mother.basis.monthlyGross : undefined} min={1} onChange={(v) => v && scenarioActions.setParent("mother", { basis: { mode: "gross", monthlyGross: v } })} suffix="zł" />
              </Field>
            )}
          </Q>
        )}

        {step.id === "partner" && (
          <Q title={isAdoption ? "Czy jest drugi opiekun?" : "Czy uwzględnić tatę (drugiego rodzica)?"} ref={headingRef}>
            <ChoiceGroup
              name="w-partner"
              legend={<span className="sr-only">Drugi rodzic</span>}
              value={s.father ? (s.father as ParentDraft).title : "no"}
              onChange={(v) => scenarioActions.setParent("father", v === "no" ? null : { ...emptyParent(v as ParentDraft["title"]) })}
              columns={2}
              options={[
                { value: "employment", label: "Tak — umowa o pracę" },
                { value: "mandate", label: "Tak — zlecenie" },
                { value: "business", label: "Tak — działalność" },
                { value: "no", label: "Nie uwzględniaj" },
              ]}
            />
            {s.father && (s.father as ParentDraft).title !== "business" && (
              <Field label="Jego wynagrodzenie brutto miesięcznie" htmlFor="w-fgross" className="mt-5">
                <NumberInput
                  id="w-fgross"
                  value={(s.father as ParentDraft).basis?.mode === "gross" ? ((s.father as ParentDraft).basis as { monthlyGross: number }).monthlyGross : undefined}
                  min={1}
                  onChange={(v) => v && scenarioActions.setParent("father", { basis: { mode: "gross", monthlyGross: v } })}
                  suffix="zł"
                />
              </Field>
            )}
          </Q>
        )}

        {step.id === "plan" && (
          <Q title="Ostatnie decyzje" ref={headingRef}>
            <div className="grid gap-5">
              <Toggle id="w-avg" checked={!!s.plan?.averaged} onChange={(v) => scenarioActions.setPlan({ averaged: v })} label={<>Stałe <Term id="81,5">81,5%</Term> przez cały okres</>} description="Zamiast 100% na początku i 70% później. Możesz porównać oba warianty w planie." />
              {s.father && (
                <Toggle
                  id="w-9"
                  checked={(s.plan?.parentalFatherWeeks ?? 0) >= 9}
                  onChange={(v) => scenarioActions.setPlan({ parentalFatherWeeks: v ? 9 : 0, parentalMotherWeeks: undefined })}
                  label="Drugi rodzic weźmie swoje 9 tygodni rodzicielskiego"
                  description="Ta część przepada, jeśli nie zostanie wykorzystana."
                />
              )}
              <Callout tone="success" icon={<Check className="size-5" />} title="Gotowe">
                Za chwilę zobaczysz plan: co Ci przysługuje, ile wyniesie zasiłek i do kiedy złożyć dokumenty.
              </Callout>
            </div>
          </Q>
        )}

        {missing && (
          <p className="mt-4 text-sm font-bold text-danger" role="alert">{missing}</p>
        )}

        <div className="mt-7 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => go(-1)} disabled={i === 0}>
            <ArrowLeft aria-hidden className="size-4" /> Wstecz
          </Button>
          <Button type="submit" size="lg" disabled={!!missing}>
            {i === STEPS.length - 1 ? "Pokaż mój plan" : "Dalej"} <ArrowRight aria-hidden className="size-5" />
          </Button>
        </div>
      </form>
      <p className="mt-4 text-center text-sm text-muted">Odpowiedzi zapisujemy na bieżąco w tej karcie przeglądarki.</p>
    </div>
  );
}

function applyEvent(event: Scenario["event"]) {
  const t = todayIso();
  if (event === "adoption" || event === "foster") {
    scenarioActions.set({ event, placementDate: addDays(t, 14), childBirthDate: addDays(t, -3 * 365), loss: undefined, premature: undefined, birthDate: undefined });
  } else if (event === "pregnancy") {
    scenarioActions.set({ event, dueDate: addDays(t, 90), birthDate: undefined, loss: undefined });
  } else {
    scenarioActions.set({ event, birthDate: addDays(t, 14), dueDate: addDays(t, 14) });
  }
}

function stepMissing(id: StepId, s: Scenario): string | null {
  const isAdoption = s.event === "adoption" || s.event === "foster";
  if (id === "dates") {
    if (isAdoption && (!s.placementDate || !s.childBirthDate)) return "Podaj obie daty, aby przejść dalej.";
    if (!isAdoption && s.event === "pregnancy" && !s.dueDate) return "Podaj przewidywaną datę porodu.";
    if (!isAdoption && s.event === "birth" && !s.birthDate) return "Podaj datę porodu.";
  }
  if (id === "salary" && s.mother.title !== "none" && s.mother.title !== "business" && s.mother.basis?.mode === "gross" && !s.mother.basis.monthlyGross) {
    return "Podaj wynagrodzenie.";
  }
  return null;
}

/** Pytanie kroku — nagłówek przyjmuje fokus po przejściu dalej. */
function Q({ title, children, ref }: { title: string; children: React.ReactNode; ref: React.Ref<HTMLHeadingElement> }) {
  return (
    <div>
      <h1 ref={ref} tabIndex={-1} className="mb-5 text-2xl font-black text-navy outline-none sm:text-3xl">
        {title}
      </h1>
      {children}
    </div>
  );
}
