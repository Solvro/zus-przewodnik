import { aiModels } from "@/ai/client";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "rodzicownik", version: "0.2.0", ai: aiModels() });
}
