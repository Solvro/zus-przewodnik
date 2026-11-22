import { NextResponse } from "next/server";
import { z } from "zod";
import { PARAMS_2026, type LegalParams } from "@/engine";
import { addParamSet, getParamSets, isAdmin, readAudit, resetParamSets } from "@/server/param-store";
import { fromZod, problem, readJson } from "@/server/http";

/** GET — zestawy parametrów i dziennik zmian. */
export function GET(req: Request) {
  if (!isAdmin(req)) return problem(401, "Brak uprawnień administratora.");
  return NextResponse.json({ sets: getParamSets(), audit: readAudit().slice(0, 50) });
}

const Patch = z.object({
  id: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/, "Tylko małe litery, cyfry i myślniki"),
  label: z.string().min(3).max(120),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  basedOn: z.string().optional(),
  changes: z.record(z.string(), z.number()),
  who: z.string().min(2).max(60).default("administrator"),
});

/** POST — nowa wersja parametrów (np. nowa płaca minimalna od 1 stycznia), na bazie istniejącej. */
export async function POST(req: Request) {
  if (!isAdmin(req)) return problem(401, "Brak uprawnień administratora.");
  const parsed = Patch.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const { id, label, validFrom, basedOn, changes, who } = parsed.data;
  const base = getParamSets().find((p) => p.id === basedOn) ?? getParamSets().at(-1) ?? PARAMS_2026;
  const next = structuredClone(base) as LegalParams;
  for (const [key, value] of Object.entries(changes)) {
    // obsługa ścieżek „rates.parental”, „parentalWeeks.single” itd.
    const parts = key.split(".");
    let target: Record<string, unknown> = next as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) target = target[part] as Record<string, unknown>;
    const last = parts.at(-1)!;
    if (typeof target?.[last] !== "number") return problem(400, `Nieznany parametr liczbowy: ${key}`);
    target[last] = value;
  }
  Object.assign(next, { id, label, validFrom, validTo: null });
  addParamSet(next, who);
  return NextResponse.json({ ok: true, set: next });
}

/** DELETE — przywrócenie parametrów domyślnych. */
export function DELETE(req: Request) {
  if (!isAdmin(req)) return problem(401, "Brak uprawnień administratora.");
  resetParamSets("administrator");
  return NextResponse.json({ ok: true });
}
