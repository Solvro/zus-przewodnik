"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Scenario } from "@/engine/types";
import { addDays, todayIso } from "@/engine/dates";

export type ParentDraft = NonNullable<Scenario["father"]>;
export type PlanDraft = NonNullable<Scenario["plan"]>;

export function emptyParent(title: ParentDraft["title"] = "employment"): ParentDraft {
  return {
    title,
    voluntarySickness: title !== "employment",
    insuranceStart: "2022-01-01",
    insuranceEnd: null,
    payerInsuredCount: 50,
    fullTime: true,
    basis: title === "business" ? { mode: "declared", monthlyBases: Array(12).fill(5652), minBaseType: "standard" } : { mode: "gross", monthlyGross: 7000 },
    contributionDebt: 0,
    basisRaisedDuringPregnancy: false,
  };
}

export function defaultScenario(): Scenario {
  const today = todayIso();
  return {
    event: "birth",
    birthDate: addDays(today, 30),
    dueDate: addDays(today, 30),
    childrenCount: 1,
    zaZyciem: false,
    mother: emptyParent("employment"),
    father: undefined,
    sickLeaves: [],
    plan: {
      averaged: false,
      prenatalWeeks: 0,
      parentalFatherWeeks: 0,
      parentalConcurrent: false,
      paternity: true,
      supplementaryBy: "mother",
    },
  };
}

interface ScenarioState {
  scenario: Scenario;
  /** Skąd pochodzą dane: ręcznie / persona z ZUS (symulacja) / dokumenty sprawy (AI). */
  source: "manual" | "zus" | "documents";
  /** Czy użytkownik cokolwiek wypełnił (przewodnik, kalkulator, dane z ZUS). */
  touched: boolean;
  hydrated: boolean;
  set: (patch: Partial<Scenario>) => void;
  setParent: (who: "mother" | "father", patch: Partial<ParentDraft> | null) => void;
  setPlan: (patch: Partial<PlanDraft>) => void;
  replace: (s: Scenario, source?: ScenarioState["source"]) => void;
  reset: () => void;
  touch: () => void;
}

const useScenarioStore = create<ScenarioState>()(
  persist(
    (set) => ({
      scenario: defaultScenario(),
      source: "manual",
      touched: false,
      hydrated: false,
      set: (patch) => set((st) => ({ scenario: { ...st.scenario, ...patch }, touched: true })),
      setParent: (who, patch) =>
        set((st) => {
          if (patch === null) return { scenario: { ...st.scenario, [who]: undefined }, touched: true };
          const current = (st.scenario[who] as ParentDraft | undefined) ?? emptyParent();
          return { scenario: { ...st.scenario, [who]: { ...current, ...patch } }, touched: true };
        }),
      setPlan: (patch) =>
        set((st) => ({ scenario: { ...st.scenario, plan: { ...(st.scenario.plan as PlanDraft), ...patch } }, touched: true })),
      replace: (scenario, source = "manual") => set({ scenario, source, touched: true }),
      reset: () => set({ scenario: defaultScenario(), source: "manual", touched: false }),
      touch: () => set({ touched: true }),
    }),
    {
      name: "pr-scenario-v1",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ scenario: s.scenario, source: s.source, touched: s.touched }),
      skipHydration: true,
      onRehydrateStorage: () => () => useScenarioStore.setState({ hydrated: true }),
    },
  ),
);

let rehydrated = false;
export function rehydrateScenario() {
  if (rehydrated) return;
  rehydrated = true;
  void useScenarioStore.persist.rehydrate();
}

export const useScenario = () => useScenarioStore((s) => s.scenario);
export const useScenarioSource = () => useScenarioStore((s) => s.source);
export const useScenarioHydrated = () => useScenarioStore((s) => s.hydrated);
export const useScenarioTouched = () => useScenarioStore((s) => s.touched);
export const scenarioActions = {
  set: (p: Partial<Scenario>) => useScenarioStore.getState().set(p),
  setParent: (w: "mother" | "father", p: Partial<ParentDraft> | null) => useScenarioStore.getState().setParent(w, p),
  setPlan: (p: Partial<PlanDraft>) => useScenarioStore.getState().setPlan(p),
  replace: (s: Scenario, source?: "manual" | "zus" | "documents") => useScenarioStore.getState().replace(s, source),
  reset: () => useScenarioStore.getState().reset(),
  /** Oznacza scenariusz jako świadomie wypełniony (np. ukończony przewodnik z domyślnymi odpowiedziami). */
  touch: () => useScenarioStore.getState().touch(),
};
