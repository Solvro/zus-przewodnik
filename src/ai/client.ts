import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { OPENAI_MODEL, OPENAI_MODEL_FAST } from "./openai";

/**
 * Klient Claude API — wyłącznie po stronie serwera (klucz nigdy nie trafia do przeglądarki).
 * Bezstanowy, więc może być współdzielony między żądaniami.
 */
export const MODEL = "claude-opus-5-5";

/** Odmowa z powodów bezpieczeństwa → serwer sam ponawia na modelu zapasowym (domyślny łańcuch). */
export const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: "default" as const,
};

let client: Anthropic | null = null;

export type AiProvider = "anthropic" | "openai";

/** Dostawca AI: Claude, gdy jest klucz Anthropic; w przeciwnym razie OpenAI; bez kluczy — tryb awaryjny. */
export function aiProvider(): AiProvider | null {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function aiConfigured(): boolean {
  return aiProvider() !== null;
}

/** Opis aktywnych modeli — do wyświetlenia w UI / health (bez sekretów). */
export function aiModels() {
  const p = aiProvider();
  if (p === "anthropic") return { provider: p, extraction: MODEL, assistant: MODEL };
  if (p === "openai") return { provider: p, extraction: OPENAI_MODEL, assistant: OPENAI_MODEL_FAST };
  return { provider: null, extraction: null, assistant: null };
}

export function getClient(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return client;
}

/** Przyjazny komunikat dla użytkownika zamiast surowego błędu API. */
export function friendlyAiError(e: unknown): { status: number; title: string } {
  if (e instanceof OpenAI.RateLimitError) return { status: 429, title: "Asystent jest teraz mocno obciążony — spróbuj za chwilę." };
  if (e instanceof OpenAI.AuthenticationError) return { status: 503, title: "Funkcja AI nie jest skonfigurowana na tym serwerze." };
  if (e instanceof OpenAI.BadRequestError) return { status: 422, title: "Nie udało się przetworzyć dokumentu lub pytania." };
  if (e instanceof OpenAI.APIConnectionError) return { status: 503, title: "Brak połączenia z usługą AI — spróbuj ponownie." };
  if (e instanceof OpenAI.APIError) return { status: 502, title: "Usługa AI zwróciła błąd — spróbuj ponownie." };
  if (e instanceof Anthropic.RateLimitError) return { status: 429, title: "Asystent jest teraz mocno obciążony — spróbuj za chwilę." };
  if (e instanceof Anthropic.AuthenticationError) return { status: 503, title: "Funkcja AI nie jest skonfigurowana na tym serwerze." };
  if (e instanceof Anthropic.BadRequestError) return { status: 422, title: "Nie udało się przetworzyć dokumentu lub pytania." };
  if (e instanceof Anthropic.APIConnectionError) return { status: 503, title: "Brak połączenia z usługą AI — spróbuj ponownie." };
  if (e instanceof Anthropic.APIError) return { status: 502, title: "Usługa AI zwróciła błąd — spróbuj ponownie." };
  return { status: 500, title: "Coś poszło nie tak po stronie serwera." };
}
