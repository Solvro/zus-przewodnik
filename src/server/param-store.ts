import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PARAM_SETS, type LegalParams } from "@/engine";

/**
 * Magazyn wersjonowanych parametrów prawnych (S10).
 * Prototyp: plik JSON na serwerze; interfejs gotowy do podmiany na bazę danych (tabela parameters + audit).
 */
const FILE = path.join(process.cwd(), "data", "param-sets.json");
const AUDIT = path.join(process.cwd(), "data", "audit-log.json");

export interface AuditEntry {
  at: string;
  who: string;
  action: string;
  details: string;
}

// Pamięć podręczna z kontrolą daty modyfikacji — trasa obliczeń widzi zmiany z panelu admina bez restartu.
let cache: { mtime: number; sets: LegalParams[] } | null = null;

function fileMtime() {
  try {
    return fs.statSync(FILE).mtimeMs;
  } catch {
    return 0;
  }
}

export function getParamSets(): LegalParams[] {
  const m = fileMtime();
  if (cache && cache.mtime === m) return cache.sets;
  let sets: LegalParams[];
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as LegalParams[];
    sets = raw.length ? raw : DEFAULT_PARAM_SETS;
  } catch {
    sets = DEFAULT_PARAM_SETS;
  }
  cache = { mtime: m, sets };
  return sets;
}

function persist(sets: LegalParams[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(sets, null, 2));
  cache = { mtime: fileMtime(), sets };
}

export function addParamSet(next: LegalParams, who: string) {
  const sets = getParamSets().map((p) =>
    // poprzedni otwarty zestaw kończy się dzień przed nowym
    p.validTo === null && p.validFrom < next.validFrom ? { ...p, validTo: dayBefore(next.validFrom) } : p,
  );
  persist([...sets.filter((p) => p.id !== next.id), next].sort((a, b) => (a.validFrom < b.validFrom ? -1 : 1)));
  audit(who, "Nowy zestaw parametrów", `${next.id} obowiązuje od ${next.validFrom}`);
}

export function resetParamSets(who: string) {
  try {
    fs.unlinkSync(FILE);
  } catch {
    /* brak pliku */
  }
  cache = null;
  audit(who, "Przywrócono parametry domyślne", DEFAULT_PARAM_SETS.map((p) => p.id).join(", "));
}

export function audit(who: string, action: string, details: string) {
  const log = readAudit();
  log.unshift({ at: new Date().toISOString(), who, action, details });
  fs.mkdirSync(path.dirname(AUDIT), { recursive: true });
  fs.writeFileSync(AUDIT, JSON.stringify(log.slice(0, 200), null, 2));
}

export function readAudit(): AuditEntry[] {
  try {
    return JSON.parse(fs.readFileSync(AUDIT, "utf8")) as AuditEntry[];
  } catch {
    return [];
  }
}

function dayBefore(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Prosta autoryzacja panelu: nagłówek x-admin-token = ADMIN_TOKEN (w demo domyślnie „demo-admin”). */
export function isAdmin(req: Request) {
  const expected = process.env.ADMIN_TOKEN ?? "demo-admin";
  return req.headers.get("x-admin-token") === expected;
}
