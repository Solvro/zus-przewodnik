import { NextResponse } from "next/server";
import { z } from "zod";
import { FEATURES } from "@/content/features";
import { getFeatures, setFeatures } from "@/server/feature-store";
import { isAdmin } from "@/server/param-store";
import { fromZod, problem, readJson } from "@/server/http";

const Patch = z
  .object(Object.fromEntries(FEATURES.map((f) => [f.key, z.boolean().optional()])) as Record<string, z.ZodOptional<z.ZodBoolean>>)
  .strict();

/** POST — włączenie / wyłączenie modułów (nagłówek x-admin-token). */
export async function POST(req: Request) {
  if (!isAdmin(req)) return problem(401, "Brak uprawnień administratora.");
  const parsed = Patch.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  return NextResponse.json(setFeatures(parsed.data, "administrator"));
}

export function GET(req: Request) {
  if (!isAdmin(req)) return problem(401, "Brak uprawnień administratora.");
  return NextResponse.json(getFeatures());
}
