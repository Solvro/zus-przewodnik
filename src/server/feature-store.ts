import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_FEATURES, type FeatureFlags } from "@/content/features";
import { audit } from "./param-store";

/** Przełączniki modułów — plik JSON (w wdrożeniu: baza danych / usługa feature flags). */
const FILE = path.join(process.cwd(), "data", "features.json");
// Pamięć podręczna z kontrolą daty modyfikacji pliku — trasy API i strony mogą mieć osobne instancje modułu.
let cache: { mtime: number; flags: FeatureFlags } | null = null;

function mtime() {
  try {
    return fs.statSync(FILE).mtimeMs;
  } catch {
    return 0;
  }
}

export function getFeatures(): FeatureFlags {
  const m = mtime();
  if (cache && cache.mtime === m) return cache.flags;
  let flags: FeatureFlags;
  try {
    flags = { ...DEFAULT_FEATURES, ...(JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<FeatureFlags>) };
  } catch {
    flags = { ...DEFAULT_FEATURES };
  }
  cache = { mtime: m, flags };
  return flags;
}

export function setFeatures(patch: Partial<FeatureFlags>, who: string) {
  const next = { ...getFeatures(), ...patch };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  cache = { mtime: mtime(), flags: next };
  const changed = Object.entries(patch).map(([k, v]) => `${k}: ${v ? "włączony" : "wyłączony"}`).join(", ");
  audit(who, "Zmiana modułów", changed);
  return next;
}

export function isFeatureOn(key: keyof FeatureFlags) {
  return getFeatures()[key];
}
