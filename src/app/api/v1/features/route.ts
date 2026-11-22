import { NextResponse } from "next/server";
import { getFeatures } from "@/server/feature-store";

export const dynamic = "force-dynamic";

/** GET — które moduły aplikacji są włączone (publiczne; steruje nawigacją i stronami). */
export function GET() {
  return NextResponse.json(getFeatures(), { headers: { "Cache-Control": "no-store" } });
}
