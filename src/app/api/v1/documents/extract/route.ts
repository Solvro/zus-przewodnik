import { isFeatureOn } from "@/server/feature-store";
import { NextResponse } from "next/server";
import { calculate } from "@/engine";
import { aiConfigured, friendlyAiError } from "@/ai/client";
import { extractCase, type UploadedDoc } from "@/ai/extract";
import { caseToScenario } from "@/ai/case-mapping";
import { problem } from "@/server/http";
import { allow } from "@/server/rate-limit";

export const maxDuration = 120;

const ALLOWED = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const MAX_FILE = 15 * 1024 * 1024;
const MAX_FILES = 8;

/**
 * POST /api/v1/documents/extract (multipart, pola „files”) — AI odczytuje dokumenty sprawy,
 * serwer mapuje je deterministycznie na scenariusz i liczy wynik silnikiem reguł.
 * Pliki przetwarzane wyłącznie w pamięci — nie są zapisywane.
 */
export async function POST(req: Request) {
  if (!isFeatureOn("documentUpload")) return problem(403, "Moduł wyłączony przez administratora.");
  if (!aiConfigured()) return problem(503, "Odczyt dokumentów przez AI nie jest skonfigurowany na tym serwerze. Wybierz przykład z listy lub wpisz dane ręcznie.");
  if (!allow(req, "extract", 6)) return problem(429, "Za dużo zapytań — spróbuj za minutę.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return problem(400, "Wyślij pliki jako multipart/form-data w polu „files”.");
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return problem(400, "Nie przesłano żadnego pliku.");
  if (files.length > MAX_FILES) return problem(400, `Maksymalnie ${MAX_FILES} plików naraz.`);
  for (const f of files) {
    if (!ALLOWED.has(f.type)) return problem(415, `Nieobsługiwany typ pliku: ${f.name}. Dozwolone: PDF, PNG, JPG, WEBP.`);
    if (f.size > MAX_FILE) return problem(413, `Plik ${f.name} jest za duży (maks. 15 MB).`);
  }

  // Odczyty plików są niezależne — równolegle (async-parallel)
  const docs: UploadedDoc[] = await Promise.all(
    files.map(async (f) => ({ name: f.name, mediaType: f.type, base64: Buffer.from(await f.arrayBuffer()).toString("base64") })),
  );

  try {
    const extracted = await extractCase(docs);
    const today = new Date().toISOString().slice(0, 10);
    const { scenario, assumptions } = caseToScenario(extracted, today);
    let result = null;
    try {
      result = calculate(scenario);
    } catch {
      assumptions.push("Nie udało się policzyć wyniku z odczytanych danych — uzupełnij je w kalkulatorze.");
    }
    return NextResponse.json({ extracted, scenario, assumptions, result, ai: true });
  } catch (e) {
    const f = friendlyAiError(e);
    return problem(f.status, e instanceof Error && f.status === 500 ? e.message : f.title);
  }
}
