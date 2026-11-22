import { isFeatureOn } from "@/server/feature-store";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, friendlyAiError } from "@/ai/client";
import { toPlainLanguage } from "@/ai/assistant";
import { fromZod, problem, readJson } from "@/server/http";
import { allow } from "@/server/rate-limit";

const Body = z.object({ text: z.string().min(20).max(8000) });

/** POST /api/v1/plain-language — przepisanie pisma / wyniku na prosty język (AI). */
export async function POST(req: Request) {
  if (!isFeatureOn("plainLanguage")) return problem(403, "Moduł wyłączony przez administratora.");
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  if (!aiConfigured()) return problem(503, "Funkcja AI nie jest skonfigurowana na tym serwerze (brak klucza API).");
  if (!allow(req, "plain", 10)) return problem(429, "Za dużo zapytań — spróbuj za minutę.");
  try {
    return NextResponse.json({ text: await toPlainLanguage(parsed.data.text), ai: true });
  } catch (e) {
    const f = friendlyAiError(e);
    return problem(f.status, f.title);
  }
}
