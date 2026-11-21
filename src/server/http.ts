import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Jednolity format błędów API (RFC 7807 — application/problem+json). */
export function problem(status: number, title: string, detail?: string, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { type: "about:blank", status, title, detail, ...extra },
    { status, headers: { "content-type": "application/problem+json" } },
  );
}

export function fromZod(err: ZodError) {
  return problem(400, "Niepoprawne dane wejściowe", "Popraw wskazane pola i spróbuj ponownie.", {
    errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
