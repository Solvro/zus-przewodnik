import { NextResponse } from "next/server";
import { getParamSets, isAdmin } from "@/server/param-store";
import { runRegression } from "@/server/regression";
import { problem } from "@/server/http";

/** GET ?paramsId=… — przelicza sprawy testowe dla wskazanego zestawu (podgląd skutków zmiany przed publikacją). */
export function GET(req: Request) {
  if (!isAdmin(req)) return problem(401, "Brak uprawnień administratora.");
  const id = new URL(req.url).searchParams.get("paramsId");
  const params = id ? getParamSets().find((p) => p.id === id) : undefined;
  const rows = runRegression(params);
  return NextResponse.json({ paramsId: params?.id ?? "domyślne wg daty", passed: rows.filter((r) => r.pass).length, total: rows.length, rows });
}
