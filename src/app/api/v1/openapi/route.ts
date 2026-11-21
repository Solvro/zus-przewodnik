import { NextResponse } from "next/server";
import { buildOpenApi } from "@/server/openapi";

// server-cache: specyfikacja jest statyczna — budujemy ją raz na proces
let cached: ReturnType<typeof buildOpenApi> | null = null;

export function GET() {
  cached ??= buildOpenApi();
  return NextResponse.json(cached);
}
