import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Prawdziwe zestawy spraw ZUS (HackNation) — trzymane poza repozytorium w private-cases/.
 * Format: private-cases/index.json = [{ id, title, description?, files: ["a.pdf", …], expected?: { outcome, monthlyAmount } }]
 */
export interface PrivateCase {
  id: string;
  title: string;
  description?: string;
  files: string[];
  expected?: { outcome: "granted" | "denied" | "unknown"; monthlyAmount: number | null; reason?: string };
}

const DIR = path.join(process.cwd(), "private-cases");

export function listPrivateCases(): PrivateCase[] {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(DIR, "index.json"), "utf8")) as PrivateCase[];
    return raw.filter((c) => c.id && Array.isArray(c.files));
  } catch {
    return [];
  }
}

export function readPrivateCaseFiles(c: PrivateCase) {
  return c.files.map((f) => {
    const safe = path.basename(f); // bez wychodzenia poza katalog
    const ext = path.extname(safe).toLowerCase();
    const mediaType = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return { name: safe, mediaType, base64: fs.readFileSync(path.join(DIR, safe)).toString("base64") };
  });
}
