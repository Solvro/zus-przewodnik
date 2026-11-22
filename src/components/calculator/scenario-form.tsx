"use client";

import { useId } from "react";
import { Baby, Briefcase, Building2, CalendarHeart, FileSignature, HeartHandshake, Plus, Trash2, UserX, Users } from "lucide-react";
import type { Scenario } from "@/engine/types";
import { PARAMS_2026 } from "@/engine/params";
import { maternityWeeks, parentalPool } from "@/engine/leave";
import { emptyParent, scenarioActions, type ParentDraft } from "@/lib/scenario-store";
import { Button, Callout, ChoiceGroup, Field, Input, Select, Toggle } from "@/components/ui/primitives";
import { NumberInput } from "@/components/ui/number-input";
import { Term } from "@/components/ui/term";

const p = PARAMS_2026;

function Section({ title, step, children, description }: { title: string; step: number; description?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 id={id} className="flex items-center gap-3 text-lg font-bold text-navy">
        <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm text-white">
          {step}
        </span>
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4 grid gap-5">{children}</div>
    </section>
  );
}

/* ─────────────── 1. Sytuacja ─────────────── */
export function SituationSection({ s }: { s: Scenario }) {
  const isAdoption = s.event === "adoption" || s.event === "foster";
  return (
    <Section step={1} title="Twoja sytuacja">
      <ChoiceGroup
        name="event"
        legend="Co się dzieje?"
        value={s.event}
        onChange={(event) => scenarioActions.set({ event, ...(event === "adoption" || event === "foster" ? { loss: undefined, premature: undefined } : {}) })}
        options={[
          { value: "pregnancy", label: "Jestem w ciąży", icon: <CalendarHeart className="size-5" /> },
          { value: "birth", label: "Dziecko się urodziło / urodzi", icon: <Baby className="size-5" /> },
          { value: "adoption", label: "Przysposobienie (adopcja)", icon: <Users className="size-5" /> },
          { value: "foster", label: "Rodzina zastępcza niezawodowa", icon: <HeartHandshake className="size-5" /> },
        ]}
      />

      {!isAdoption ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={s.event === "pregnancy" ? "Przewidywana data porodu" : "Data porodu"} htmlFor="birthDate" hint={s.event === "birth" ? "Jeśli dziecko jeszcze się nie urodziło — podaj przewidywaną." : undefined}>
            <Input
              id="birthDate"
              type="date"
              value={(s.event === "pregnancy" ? s.dueDate : s.birthDate) ?? ""}
              onChange={(e) =>
                scenarioActions.set(
                  s.event === "pregnancy"
                    ? { dueDate: e.target.value, birthDate: undefined }
                    : { birthDate: e.target.value, dueDate: s.dueDate && s.dueDate !== s.birthDate ? s.dueDate : e.target.value },
                )
              }
            />
          </Field>
          <Field label="Liczba dzieci przy jednym porodzie" htmlFor="children">
            <Select id="children" value={s.childrenCount ?? 1} onChange={(e) => scenarioActions.set({ childrenCount: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n === 5 ? "5 lub więcej" : n}</option>
              ))}
            </Select>
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data przyjęcia dziecka" htmlFor="placementDate">
            <Input id="placementDate" type="date" value={s.placementDate ?? ""} onChange={(e) => scenarioActions.set({ placementDate: e.target.value })} />
          </Field>
          <Field label="Data urodzenia dziecka" htmlFor="childBirthDate">
            <Input id="childBirthDate" type="date" value={s.childBirthDate ?? ""} onChange={(e) => scenarioActions.set({ childBirthDate: e.target.value })} />
          </Field>
          <Field label="Liczba dzieci przyjętych jednocześnie" htmlFor="childrenA">
            <Select id="childrenA" value={s.childrenCount ?? 1} onChange={(e) => scenarioActions.set({ childrenCount: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n === 5 ? "5 lub więcej" : n}</option>
              ))}
            </Select>
          </Field>
          {s.event === "foster" && (
            <div className="sm:col-span-2">
              <Toggle id="schoolDeferred" checked={!!s.schoolDeferred} onChange={(v) => scenarioActions.set({ schoolDeferred: v })} label="Dziecko ma odroczony obowiązek szkolny" description="Wtedy zasiłek przysługuje przy przyjęciu dziecka do 10. roku życia (zamiast 7.)." />
            </div>
          )}
        </div>
      )}

      <Toggle
        id="zaZyciem"
        checked={!!s.zaZyciem}
        onChange={(v) => scenarioActions.set({ zaZyciem: v })}
        label={<>Dziecko ma zaświadczenie <Term id="za-zyciem">„Za życiem”</Term></>}
        description="Wydłuża urlop rodzicielski do 65 tygodni (67 przy wieloraczkach)."
      />

      {s.event === "birth" && <PrematureFields s={s} />}
      {s.event === "birth" && <LossFields s={s} />}
      {(s.event === "pregnancy" || s.event === "birth") && <SickLeaveFields s={s} />}
    </Section>
  );
}

function PrematureFields({ s }: { s: Scenario }) {
  const on = !!s.premature;
  return (
    <div className="grid gap-4">
      <Toggle
        id="premature"
        checked={on}
        onChange={(v) => scenarioActions.set({ premature: v ? { gestationWeek: 32, birthWeightG: 1600, hospitalDays: 21 } : undefined })}
        label={<>Wcześniak lub dziecko w szpitalu po porodzie</>}
        description={<>Sprawdzimy prawo do <Term id="uzupelniajacy">uzupełniającego urlopu macierzyńskiego</Term>.</>}
      />
      {on && s.premature && (
        <div className="grid gap-4 rounded-ui bg-canvas p-4 sm:grid-cols-2">
          <Field label="Tydzień ciąży przy porodzie" htmlFor="gw">
            <NumberInput id="gw" value={s.premature.gestationWeek} min={20} max={44} onChange={(v) => v && scenarioActions.set({ premature: { ...s.premature!, gestationWeek: Math.round(v) } })} suffix="tc" />
          </Field>
          <Field label="Masa urodzeniowa" htmlFor="weight" hint="Przy bliźniętach — najniższa.">
            <NumberInput id="weight" value={s.premature.birthWeightG} min={200} max={7000} onChange={(v) => v && scenarioActions.set({ premature: { ...s.premature!, birthWeightG: Math.round(v) } })} suffix="g" />
          </Field>
          <Field label="Łącznie dni w szpitalu" htmlFor="hosp" hint="Przy bliźniętach — najdłużej hospitalizowane dziecko.">
            <NumberInput id="hosp" value={s.premature.hospitalDays} min={0} max={200} onChange={(v) => v !== undefined && scenarioActions.set({ premature: { ...s.premature!, hospitalDays: Math.round(v) } })} suffix="dni" />
          </Field>
          {s.premature.gestationWeek >= 37 && (
            <Field label="Od którego dnia po porodzie dziecko było w szpitalu?" htmlFor="hospStart" hint="Liczy się pobyt zaczęty między 5. a 28. dniem.">
              <NumberInput id="hospStart" value={s.premature.hospitalStartDay} min={0} max={200} onChange={(v) => scenarioActions.set({ premature: { ...s.premature!, hospitalStartDay: v === undefined ? undefined : Math.round(v) } })} suffix="dzień" />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

function LossFields({ s }: { s: Scenario }) {
  const on = !!s.loss;
  return (
    <div className="grid gap-4">
      <Toggle
        id="loss"
        checked={on}
        onChange={(v) => scenarioActions.set({ loss: v ? { type: "stillbirth", survivingChildren: 0 } : undefined })}
        label="Strata dziecka"
        description="Martwe urodzenie lub śmierć dziecka. Wyjaśnimy, co przysługuje — bez zbędnych formalności."
      />
      {on && s.loss && (
        <div className="grid gap-4 rounded-ui bg-canvas p-4">
          <ChoiceGroup
            name="lossType"
            legend="Co się stało?"
            value={s.loss.type}
            onChange={(type) => scenarioActions.set({ loss: { ...s.loss!, type } })}
            options={[
              { value: "stillbirth", label: "Dziecko urodziło się martwe" },
              { value: "death", label: "Dziecko zmarło po porodzie" },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {s.loss.type === "death" && (
              <Field label="Data śmierci dziecka" htmlFor="deathDate">
                <Input id="deathDate" type="date" value={s.loss.deathDate ?? ""} onChange={(e) => scenarioActions.set({ loss: { ...s.loss!, deathDate: e.target.value } })} />
              </Field>
            )}
            {(s.childrenCount ?? 1) > 1 && (
              <Field label="Ile dzieci z tego porodu żyje?" htmlFor="surviving">
                <NumberInput id="surviving" value={s.loss.survivingChildren ?? 0} min={0} max={(s.childrenCount ?? 1) - 1} onChange={(v) => scenarioActions.set({ loss: { ...s.loss!, survivingChildren: Math.round(v ?? 0) } })} />
              </Field>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SickLeaveFields({ s }: { s: Scenario }) {
  const leaves = s.sickLeaves ?? [];
  const update = (i: number, patch: Partial<(typeof leaves)[number]>) =>
    scenarioActions.set({ sickLeaves: leaves.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-bold">
        Zwolnienia lekarskie w ciąży (<Term id="kod-B">kod „B”</Term>)
      </legend>
      {leaves.length === 0 && <p className="text-sm text-muted">Brak — dodaj, jeśli byłaś lub jesteś na zwolnieniu w ciąży.</p>}
      {leaves.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <Field label="Od" htmlFor={`sl-from-${i}`}>
            <Input id={`sl-from-${i}`} type="date" value={l.from} onChange={(e) => update(i, { from: e.target.value })} />
          </Field>
          <Field label="Do" htmlFor={`sl-to-${i}`}>
            <Input id={`sl-to-${i}`} type="date" value={l.to} onChange={(e) => update(i, { to: e.target.value })} />
          </Field>
          <Button type="button" variant="ghost" aria-label={`Usuń zwolnienie ${i + 1}`} onClick={() => scenarioActions.set({ sickLeaves: leaves.filter((_, j) => j !== i) })} className="size-11 px-0">
            <Trash2 aria-hidden className="size-5" />
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            const base = s.dueDate ?? s.birthDate ?? new Date().toISOString().slice(0, 10);
            scenarioActions.set({ sickLeaves: [...leaves, { from: shift(base, -90), to: shift(base, -60), pregnancyCodeB: true }] });
          }}
        >
          <Plus aria-hidden className="size-4" /> Dodaj zwolnienie
        </Button>
      </div>
    </fieldset>
  );
}

function shift(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ─────────────── 2/3. Rodzic ─────────────── */
const TITLE_OPTIONS = [
  { value: "employment" as const, label: "Umowa o pracę", icon: <Briefcase className="size-5" /> },
  { value: "mandate" as const, label: "Umowa zlecenie", icon: <FileSignature className="size-5" /> },
  { value: "business" as const, label: "Własna działalność", icon: <Building2 className="size-5" /> },
  { value: "none" as const, label: "Nie pracuję / brak ubezpieczenia", icon: <UserX className="size-5" /> },
];

export function ParentSection({ s, who, step }: { s: Scenario; who: "mother" | "father"; step: number }) {
  const isAdoption = s.event === "adoption" || s.event === "foster";
  const parent = who === "mother" ? s.mother : s.father;
  const title =
    who === "mother" ? (isAdoption ? "Opiekun przyjmujący dziecko" : "Mama") : isAdoption ? "Drugi opiekun" : "Tata (drugi rodzic)";

  if (who === "father" && !parent) {
    return (
      <Section step={step} title={title} description="Dodaj drugiego rodzica, aby policzyć urlop ojcowski, podział rodzicielskiego i 9 tygodni dla taty.">
        <div>
          <Button type="button" variant="secondary" onClick={() => scenarioActions.setParent("father", emptyParent("employment"))}>
            <Plus aria-hidden className="size-4" /> Uwzględnij drugiego rodzica
          </Button>
        </div>
      </Section>
    );
  }
  const pr = parent as ParentDraft;
  const set = (patch: Partial<ParentDraft>) => scenarioActions.setParent(who, patch);
  const idp = who;

  return (
    <Section step={step} title={title}>
      <ChoiceGroup
        name={`${idp}-title`}
        legend="Jak pracujesz?"
        value={pr.title}
        onChange={(t) => scenarioActions.setParent(who, { ...emptyParent(t), insuranceStart: pr.insuranceStart })}
        options={TITLE_OPTIONS}
      />

      {pr.title !== "none" && (
        <>
          {(pr.title === "mandate" || pr.title === "business") && (
            <Toggle
              id={`${idp}-vol`}
              checked={!!pr.voluntarySickness}
              onChange={(v) => set({ voluntarySickness: v })}
              label="Opłacam dobrowolne ubezpieczenie chorobowe"
              description="Bez niego zasiłek macierzyński i chorobowy nie przysługują."
            />
          )}

          {pr.title !== "business" && (
            <ChoiceGroup
              name={`${idp}-payer`}
              legend={<>Ile osób zgłasza do ubezpieczenia Twój <Term id="platnik">płatnik</Term>?</>}
              value={pr.payerInsuredCount === undefined ? "unknown" : pr.payerInsuredCount > 20 ? "large" : "small"}
              onChange={(v) => set({ payerInsuredCount: v === "unknown" ? undefined : v === "large" ? 50 : 10 })}
              columns={3}
              options={[
                { value: "small", label: "20 lub mniej", description: "zasiłek wypłaci ZUS" },
                { value: "large", label: "Ponad 20", description: "zasiłek wypłaci pracodawca" },
                { value: "unknown", label: "Nie wiem", description: "wyjaśnimy obie drogi" },
              ]}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Od kiedy masz tę umowę / działalność?" htmlFor={`${idp}-start`}>
              <Input id={`${idp}-start`} type="date" value={pr.insuranceStart ?? ""} onChange={(e) => set({ insuranceStart: e.target.value || undefined })} />
            </Field>
            <Field label="Do kiedy? (puste = bezterminowo)" htmlFor={`${idp}-end`}>
              <Input id={`${idp}-end`} type="date" value={pr.insuranceEnd ?? ""} onChange={(e) => set({ insuranceEnd: e.target.value || null })} />
            </Field>
          </div>

          {pr.title === "employment" && pr.insuranceEnd && who === "mother" && !isAdoption && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rodzaj umowy" htmlFor={`${idp}-ct`}>
                <Select id={`${idp}-ct`} value={pr.contractType ?? "fixed"} onChange={(e) => set({ contractType: e.target.value as ParentDraft["contractType"] })}>
                  <option value="fixed">Na czas określony</option>
                  <option value="trial">Na okres próbny (dłuższy niż miesiąc)</option>
                  <option value="indefinite">Na czas nieokreślony (wypowiedziana)</option>
                </Select>
              </Field>
              <Field label="Dlaczego umowa się kończy?" htmlFor={`${idp}-er`}>
                <Select id={`${idp}-er`} value={pr.endReason ?? "regular"} onChange={(e) => set({ endReason: e.target.value as ParentDraft["endReason"] })}>
                  <option value="regular">Upływ czasu / inna przyczyna</option>
                  <option value="bankruptcy">Upadłość pracodawcy</option>
                  <option value="liquidation">Likwidacja pracodawcy</option>
                  <option value="employer_death">Śmierć pracodawcy</option>
                  <option value="unlawful_court">Zwolnienie z naruszeniem prawa (wyrok sądu)</option>
                </Select>
              </Field>
            </div>
          )}

          <BasisFields pr={pr} idp={idp} set={set} />

          {pr.title === "business" && (
            <Field label="Zaległość w składkach ZUS" htmlFor={`${idp}-debt`} hint="Powyżej 1% minimalnego wynagrodzenia (48,06 zł) blokuje wypłatę do czasu spłaty. Sprawdzisz w eZUS.">
              <NumberInput id={`${idp}-debt`} value={pr.contributionDebt ?? 0} min={0} onChange={(v) => set({ contributionDebt: v ?? 0 })} suffix="zł" />
            </Field>
          )}

          <details className="rounded-ui bg-canvas p-3">
            <summary className="inline-flex min-h-11 items-center font-bold text-primary">Więcej szczegółów</summary>
            <div className="mt-3 grid gap-4">
              {pr.title === "employment" && (
                <>
                  <Toggle id={`${idp}-ft`} checked={pr.fullTime !== false} onChange={(v) => set({ fullTime: v })} label="Pełny etat" description="Przy pełnym etacie podstawa nie może być niższa niż 4 147,10 zł." />
                  <Field label="Wiek" htmlFor={`${idp}-age`} hint="Od 50. roku życia pracodawca płaci za 14, a nie 33 dni choroby w roku.">
                    <NumberInput id={`${idp}-age`} value={pr.age} min={15} max={80} onChange={(v) => set({ age: v === undefined ? undefined : Math.round(v) })} suffix="lat" />
                  </Field>
                </>
              )}
              <Toggle id={`${idp}-raised`} checked={!!pr.basisRaisedDuringPregnancy} onChange={(v) => set({ basisRaisedDuringPregnancy: v })} label="Podstawa składek wzrosła w trakcie ciąży" description="Np. podwyżka lub wyższa deklarowana podstawa — ZUS może to sprawdzić." />
              {who === "father" && (
                <Button type="button" variant="ghost" className="justify-self-start text-danger" onClick={() => scenarioActions.setParent("father", null)}>
                  <Trash2 aria-hidden className="size-4" /> Usuń drugiego rodzica z obliczeń
                </Button>
              )}
            </div>
          </details>
        </>
      )}
      {pr.title === "none" && who === "father" && (
        <Button type="button" variant="ghost" className="justify-self-start text-danger" onClick={() => scenarioActions.setParent("father", null)}>
          <Trash2 aria-hidden className="size-4" /> Usuń drugiego rodzica z obliczeń
        </Button>
      )}
    </Section>
  );
}

function BasisFields({ pr, idp, set }: { pr: ParentDraft; idp: string; set: (p: Partial<ParentDraft>) => void }) {
  const b = pr.basis;
  if (pr.title === "business") {
    const bases = b?.mode === "declared" ? b.monthlyBases : [];
    const amount = bases[0] ?? 5652;
    const months = bases.length;
    const minType = b?.mode === "declared" ? b.minBaseType : "standard";
    const update = (a: number, m: number, t = minType) => set({ basis: { mode: "declared", monthlyBases: Array(m).fill(a), minBaseType: t } });
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deklarowana podstawa składki chorobowej" htmlFor={`${idp}-decl`} hint="Najczęściej 5 652 zł (2026). Maksimum 23 550 zł.">
          <NumberInput id={`${idp}-decl`} value={amount} min={0} onChange={(v) => v !== undefined && update(v, Math.max(months, 1))} suffix="zł" />
        </Field>
        <Field label="Ile pełnych miesięcy płacisz chorobowe?" htmlFor={`${idp}-months`} hint="Do 12 ostatnich miesięcy.">
          <Select id={`${idp}-months`} value={months} onChange={(e) => update(amount, Number(e.target.value))}>
            {Array.from({ length: 13 }, (_, i) => (
              <option key={i} value={i}>{i === 0 ? "Mniej niż miesiąc" : i === 12 ? "12 lub więcej" : `${i}`}</option>
            ))}
          </Select>
        </Field>
        <Field label="Rodzaj podstawy" htmlFor={`${idp}-mintype`} className="sm:col-span-2">
          <Select id={`${idp}-mintype`} value={minType} onChange={(e) => update(amount, months, e.target.value as "standard" | "preferential")}>
            <option value="standard">Standardowa (60% prognozowanego wynagrodzenia)</option>
            <option value="preferential">Preferencyjna — „mały ZUS” (30% minimalnego wynagrodzenia)</option>
          </Select>
        </Field>
      </div>
    );
  }
  const direct = b?.mode === "direct";
  return (
    <div className="grid gap-3">
      {direct ? (
        <Field label={<>Podstawa wymiaru zasiłku z dokumentu (np. <Term id="Z-3">Z-3</Term>)</>} htmlFor={`${idp}-basis`} hint={<>Kwota już po odliczeniu 13,71% składek. <Term id="podstawa">Co to jest?</Term></>}>
          <NumberInput id={`${idp}-basis`} value={b.monthlyBasis} min={1} onChange={(v) => v && set({ basis: { mode: "direct", monthlyBasis: v } })} suffix="zł" />
        </Field>
      ) : (
        <Field label="Wynagrodzenie brutto miesięcznie (średnio z 12 miesięcy)" htmlFor={`${idp}-gross`} hint="Licz z premiami regulaminowymi. Szczegółową podstawę policzymy z dokumentu Z-3.">
          <NumberInput id={`${idp}-gross`} value={b?.mode === "gross" ? b.monthlyGross : undefined} min={1} onChange={(v) => v && set({ basis: { mode: "gross", monthlyGross: v } })} suffix="zł" />
        </Field>
      )}
      <Button
        type="button"
        variant="link"
        className="justify-self-start text-sm"
        onClick={() => set({ basis: direct ? { mode: "gross", monthlyGross: 7000 } : { mode: "direct", monthlyBasis: 6040.3 } })}
      >
        {direct ? "Wolę podać pensję brutto" : "Znam dokładną podstawę wymiaru (z Z-3 / decyzji)"}
      </Button>
    </div>
  );
}

/* ─────────────── 4. Plan ─────────────── */
export function PlanSection({ s, step }: { s: Scenario; step: number }) {
  const plan = s.plan ?? {};
  const set = scenarioActions.setPlan;
  const isAdoption = s.event === "adoption" || s.event === "foster";
  const pool = parentalPool(s.childrenCount ?? 1, !!s.zaZyciem, p);
  const W = maternityWeeks(s.childrenCount ?? 1, p);
  const hasFather = !!s.father && s.father.title !== "none";
  const maxPer = pool - p.parentalExclusiveWeeks;
  const afterBirth = W - (plan.prenatalWeeks ?? 0);

  return (
    <Section step={step} title="Wasz plan" description="Zmieniaj ustawienia — wynik przelicza się od razu.">
      {!s.loss && (
        <Toggle
          id="averaged"
          checked={!!plan.averaged}
          onChange={(v) => set({ averaged: v })}
          label={<>Wariant <Term id="81,5">81,5%</Term> przez cały okres</>}
          description="Zamiast 100% za macierzyński i 70% za rodzicielski. Wniosek do 21 dni po porodzie / przyjęciu dziecka."
        />
      )}

      {!isAdoption && !s.loss && (
        <Field label="Ile tygodni urlopu macierzyńskiego przed porodem?" htmlFor="prenatal" hint="Maksymalnie 6 — wliczają się do 20 tygodni. Zawsze 100%.">
          <Select id="prenatal" value={plan.prenatalWeeks ?? 0} onChange={(e) => set({ prenatalWeeks: Number(e.target.value) })}>
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n === 0 ? "Od dnia porodu" : `${n} tyg.`}</option>
            ))}
          </Select>
        </Field>
      )}

      {hasFather && !s.loss && (
        <>
          {!isAdoption && <MotherUnableFields s={s} afterBirth={W} />}
          {!isAdoption && !plan.motherUnable && s.mother.title !== "none" && (
            <Field
              label="Ile tygodni macierzyńskiego po porodzie wykorzysta mama?"
              htmlFor="motherMat"
              hint={`Co najmniej 14. Resztę (do ${afterBirth}) może przejąć tata, jeśli mama wraca do pracy.`}
            >
              <Select id="motherMat" value={plan.motherMaternityWeeksAfterBirth ?? afterBirth} onChange={(e) => set({ motherMaternityWeeksAfterBirth: Number(e.target.value) })}>
                {Array.from({ length: afterBirth - 13 }, (_, i) => 14 + i).map((n) => (
                  <option key={n} value={n}>{n === afterBirth ? `${n} tyg. — cały` : `${n} tyg. (tata: ${afterBirth - n} tyg.)`}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field
            label={`Ile tygodni rodzicielskiego weźmie ${isAdoption ? "drugi opiekun" : "tata"}?`}
            htmlFor="fatherWeeks"
            hint={`Pierwsze 9 tygodni należy tylko do niego (płatne 70%) — niewykorzystane przepadają. Maksymalnie ${maxPer} z ${pool}.`}
          >
            <Select id="fatherWeeks" value={plan.parentalFatherWeeks ?? 0} onChange={(e) => set({ parentalFatherWeeks: Number(e.target.value), parentalMotherWeeks: undefined })}>
              {Array.from({ length: maxPer + 1 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>{n === 0 ? "Nie bierze" : `${n} tyg.`}{n === 9 ? " — cała część taty" : ""}</option>
              ))}
            </Select>
          </Field>
          <Toggle id="concurrent" checked={!!plan.parentalConcurrent} onChange={(v) => set({ parentalConcurrent: v })} label="Rodzicielski w tym samym czasie" description="Oboje na urlopie jednocześnie — urlop skończy się wcześniej." />
          {s.event !== "foster" && (
            <Toggle id="paternity" checked={plan.paternity !== false} onChange={(v) => set({ paternity: v })} label="Urlop ojcowski (2 tygodnie, 100%)" description="Do ukończenia przez dziecko 12 miesięcy. Można w dwóch częściach po tygodniu." />
          )}
          {s.premature && (
            <ChoiceGroup
              name="supBy"
              legend="Kto weźmie uzupełniający urlop macierzyński?"
              value={plan.supplementaryBy ?? "mother"}
              onChange={(v) => set({ supplementaryBy: v })}
              options={[
                { value: "mother", label: "Mama" },
                { value: "father", label: "Tata" },
              ]}
            />
          )}
        </>
      )}

      {!s.loss && <PartTimeFields s={s} />}
      {s.loss && (
        <Callout tone="neutral" title="Nie musisz teraz niczego planować">
          Zasiłek po stracie dziecka przysługuje automatycznie na podstawie dokumentów. Poniżej znajdziesz wyliczenie i listę organizacji, które mogą pomóc.
        </Callout>
      )}
    </Section>
  );
}

const UNABLE_REASONS = [
  { value: "incapacity", label: "Mama ma orzeczenie o niezdolności do samodzielnej egzystencji" },
  { value: "hospital", label: "Mama jest w szpitalu i nie może opiekować się dzieckiem" },
  { value: "death", label: "Mama zmarła" },
  { value: "abandonment", label: "Mama porzuciła dziecko" },
] as const;

/** KP art. 180 § 6–15: tata przejmuje urlop macierzyński wcześniej niż po 14 tygodniach. */
function MotherUnableFields({ s, afterBirth }: { s: Scenario; afterBirth: number }) {
  const mu = s.plan?.motherUnable;
  const set = scenarioActions.setPlan;
  return (
    <div className="grid gap-4">
      <Toggle
        id="motherUnable"
        checked={!!mu}
        onChange={(v) => set({ motherUnable: v ? { reason: "hospital", afterWeeks: 8, hospitalWeeks: 2 } : undefined })}
        label="Sytuacja szczególna mamy"
        description="Choroba, pobyt w szpitalu, śmierć mamy lub porzucenie dziecka — tata może przejąć urlop macierzyński wcześniej niż po 14 tygodniach."
      />
      {mu && (
        <div className="grid gap-4 rounded-ui bg-canvas p-4 sm:grid-cols-2">
          <Field label="Co się stało?" htmlFor="muReason" className="sm:col-span-2">
            <Select id="muReason" value={mu.reason} onChange={(e) => set({ motherUnable: { ...mu, reason: e.target.value as typeof mu.reason } })}>
              {UNABLE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="W którym tygodniu po porodzie?"
            htmlFor="muWeek"
            hint={mu.reason === "death" ? "Tata przejmuje urlop od dnia śmierci mamy." : "Przejęcie możliwe po wykorzystaniu przez mamę co najmniej 8 tygodni."}
          >
            <NumberInput id="muWeek" value={mu.afterWeeks} min={0} max={afterBirth} onChange={(v) => v !== undefined && set({ motherUnable: { ...mu, afterWeeks: Math.round(v) } })} suffix="tydz." />
          </Field>
          {mu.reason === "hospital" && (
            <Field label="Ile tygodni potrwa pobyt w szpitalu?" htmlFor="muHosp" hint="Potem mama wraca do swojej części urlopu.">
              <NumberInput id="muHosp" value={mu.hospitalWeeks ?? 1} min={1} max={afterBirth} onChange={(v) => v && set({ motherUnable: { ...mu, hospitalWeeks: Math.round(v) } })} suffix="tyg." />
            </Field>
          )}
          <p className="text-xs text-muted sm:col-span-2">
            Kodeks pracy art. 180 § 6–15, ustawa zasiłkowa art. 29 ust. 5–9. Szczegóły i wsparcie:{" "}
            <a href="/wsparcie/trudna-sytuacja" className="font-bold text-primary underline underline-offset-4">Trudna sytuacja</a>.
          </p>
        </div>
      )}
    </div>
  );
}

function PartTimeFields({ s }: { s: Scenario }) {
  const pt = s.plan?.partTime;
  const set = scenarioActions.setPlan;
  return (
    <div className="grid gap-4">
      <Toggle
        id="partTime"
        checked={!!pt}
        onChange={(v) => set({ partTime: v ? { parent: "mother", fraction: 0.5, weeks: 12 } : undefined })}
        label="Praca na część etatu w trakcie rodzicielskiego"
        description="Do ½ etatu u tego samego pracodawcy. Zasiłek maleje proporcjonalnie, a urlop się wydłuża."
      />
      {pt && (
        <div className="grid gap-4 rounded-ui bg-canvas p-4 sm:grid-cols-3">
          {s.father && (
            <Field label="Kto?" htmlFor="ptWho">
              <Select id="ptWho" value={pt.parent} onChange={(e) => set({ partTime: { ...pt, parent: e.target.value as "mother" | "father" } })}>
                <option value="mother">Mama</option>
                <option value="father">Tata</option>
              </Select>
            </Field>
          )}
          <Field label="Wymiar pracy" htmlFor="ptFrac">
            <Select id="ptFrac" value={pt.fraction} onChange={(e) => set({ partTime: { ...pt, fraction: Number(e.target.value) } })}>
              <option value={0.25}>¼ etatu</option>
              <option value={0.375}>⅜ etatu</option>
              <option value={0.5}>½ etatu</option>
            </Select>
          </Field>
          <Field label="Przez ile tygodni?" htmlFor="ptWeeks">
            <NumberInput id="ptWeeks" value={pt.weeks} min={1} max={86} onChange={(v) => v && set({ partTime: { ...pt, weeks: Math.round(v) } })} suffix="tyg." />
          </Field>
        </div>
      )}
    </div>
  );
}
