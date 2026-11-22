import { NextResponse } from "next/server";
import { derived, selectParams } from "@/engine";
import { getParamSets } from "@/server/param-store";

/** GET /api/v1/parameters?date=RRRR-MM-DD — zestaw parametrów prawnych obowiązujący w danym dniu. */
export function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const sets = getParamSets();
  const params = selectParams(date, sets);
  const { net: _net, ...computed } = derived(params);
  void _net;
  return NextResponse.json({ date, params, derived: computed, available: sets.map((p) => ({ id: p.id, validFrom: p.validFrom, validTo: p.validTo, label: p.label })) });
}
