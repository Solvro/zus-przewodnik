"use client";

import { keepPreviousData, useMutation, useQueries, useQuery } from "@tanstack/react-query";
import type { Persona, PersonaZusData } from "@/mocks/personas";
import type { SessionUser } from "@/lib/session";
import type { CalculationResult, LegalParams, Scenario } from "@/engine";
import { api } from "./client";

/** Klucze zapytań w jednym miejscu — łatwa inwalidacja (np. po zmianie parametrów w adminie). */
export const qk = {
  calculate: (s: Scenario) => ["calculate", s] as const,
  parameters: (date?: string) => ["parameters", date ?? "today"] as const,
};

export const calculateRequest = (s: Scenario, signal?: AbortSignal) =>
  api<CalculationResult>("/api/v1/calculate", { json: s, signal });

/** Obliczenie scenariusza przez REST API; poprzedni wynik zostaje na ekranie do czasu nowego. */
export function useCalculateQuery(s: Scenario, enabled = true) {
  return useQuery({
    queryKey: qk.calculate(s),
    queryFn: ({ signal }) => calculateRequest(s, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Kilka wariantów równolegle (async-parallel). */
export function useCalculateMany(list: Scenario[], enabled = true) {
  return useQueries({
    queries: list.map((s) => ({
      queryKey: qk.calculate(s),
      queryFn: ({ signal }: { signal: AbortSignal }) => calculateRequest(s, signal),
      enabled,
    })),
  });
}

export function useParametersQuery(date?: string) {
  return useQuery({
    queryKey: qk.parameters(date),
    queryFn: () =>
      api<{ date: string; params: LegalParams; derived: Record<string, number> }>(
        `/api/v1/parameters${date ? `?date=${date}` : ""}`,
      ),
    staleTime: Infinity,
  });
}

/* ───────────── Symulowane integracje (mObywatel, ZUS, PUE, RSC) ───────────── */

export type PersonaSummary = Pick<Persona, "id" | "firstName" | "lastName" | "headline" | "story" | "tags">;

export const mockKeys = {
  personas: ["mock", "personas"] as const,
  insured: (id: string) => ["mock", "zus", "insured", id] as const,
  ezla: (id: string) => ["mock", "zus", "ezla", id] as const,
  debt: (id: string, date?: string) => ["mock", "zus", "debt", id, date ?? "today"] as const,
  messages: (id: string) => ["mock", "pue", "messages", id] as const,
};

export function usePersonasQuery() {
  return useQuery({ queryKey: mockKeys.personas, queryFn: () => api<PersonaSummary[]>("/api/v1/mock/personas"), staleTime: Infinity });
}

export interface InsuredResponse {
  asOf: string;
  person: { firstName: string; lastName: string; peselMasked: string };
  insurance: PersonaZusData["insurance"];
  scenario: Scenario;
  source: string;
}

export function useInsuredQuery(id: string | undefined) {
  return useQuery({
    queryKey: mockKeys.insured(id ?? ""),
    queryFn: () => api<InsuredResponse>(`/api/v1/mock/zus/insured/${id}`),
    enabled: !!id,
  });
}

export function useEzlaQuery(id: string | undefined) {
  return useQuery({
    queryKey: mockKeys.ezla(id ?? ""),
    queryFn: () => api<{ asOf: string; items: PersonaZusData["ezla"] }>(`/api/v1/mock/zus/ezla/${id}`),
    enabled: !!id,
  });
}

export interface DebtCertificate {
  certificateNo: string;
  issuedAt: string;
  asOf: string;
  applies: boolean;
  debt: number;
  threshold: number;
  blocksBenefit: boolean;
  note: string;
}

export function useDebtQuery(id: string | undefined, date?: string, enabled = true) {
  return useQuery({
    queryKey: mockKeys.debt(id ?? "", date),
    queryFn: () => api<DebtCertificate>(`/api/v1/mock/zus/debt/${id}${date ? `?date=${date}` : ""}`),
    enabled: !!id && enabled,
  });
}

export function usePueMessagesQuery(id: string | undefined) {
  return useQuery({
    queryKey: mockKeys.messages(id ?? ""),
    queryFn: () => api<PersonaZusData["messages"]>(`/api/v1/mock/pue/messages/${id}`),
    enabled: !!id,
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: (personaId: string) =>
      api<{ user: SessionUser; assurance: string; token: string }>("/api/v1/mock/mobywatel/login", { json: { personaId } }),
  });
}

export function useAskPueMutation() {
  return useMutation({
    mutationFn: (v: { personaId: string; topic: string; text: string }) =>
      api<{ caseNo: string; status: string; expectedReplyDays: number; message: string }>("/api/v1/mock/pue/question", { json: v }),
  });
}

export function useRscMutation() {
  return useMutation({
    mutationFn: (v: { kind: "skrocony" | "zupelny"; childFirstName: string; birthDate: string; purpose: string }) =>
      api<{ caseNo: string; status: string; delivery: string }>("/api/v1/mock/rsc/odpis", { json: v }),
  });
}

export function useSubmitMutation() {
  return useMutation({
    mutationFn: (v: { formCode: string; to: "employer" | "zus" | "payer"; payload: Record<string, unknown> }) =>
      api<{ id: string; status: string; receivedAt: string; upo: string; message: string }>("/api/v1/mock/submit", { json: v }),
  });
}
