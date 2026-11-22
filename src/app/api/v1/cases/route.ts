import { NextResponse } from "next/server";
import { SAMPLE_CASES } from "@/mocks/sample-cases";
import { listPrivateCases } from "@/server/private-cases";
import { aiConfigured } from "@/ai/client";

/** GET /api/v1/cases — przykładowe sprawy do testów (fikcyjne + prywatne zestawy ZUS, jeśli są na serwerze). */
export function GET() {
  return NextResponse.json({
    aiAvailable: aiConfigured(),
    cases: [
      ...listPrivateCases().map((c) => ({ id: c.id, title: c.title, description: c.description ?? `${c.files.length} dokumentów`, source: "zus" as const, needsAi: true })),
      ...SAMPLE_CASES.map((c) => ({ id: c.id, title: c.title, description: c.description, source: "sample" as const, needsAi: false })),
    ],
  });
}
