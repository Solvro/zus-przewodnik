import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "przewodnik-rodzica", version: "0.1.0" });
}
