import "server-only";
import Link from "next/link";
import { PowerOff } from "lucide-react";
import { FEATURES, type FeatureKey } from "@/content/features";
import { isFeatureOn } from "@/server/feature-store";

/** Strona modułu wyłączonego w panelu administracyjnym — zamiast treści krótka informacja. */
export function FeatureGate({ feature, children }: { feature: FeatureKey; children: React.ReactNode }) {
  if (isFeatureOn(feature)) return <>{children}</>;
  const f = FEATURES.find((x) => x.key === feature)!;
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <PowerOff aria-hidden className="mx-auto size-10 text-muted" />
      <h1 className="mt-4 text-3xl text-navy">Ten moduł jest chwilowo wyłączony</h1>
      <p className="mt-3 text-muted">
        „{f.label}” wyłączył administrator serwisu. Pozostałe funkcje działają normalnie.
      </p>
      <Link href="/" className="mt-6 inline-block font-bold text-primary underline underline-offset-4">
        Wróć na stronę główną
      </Link>
    </div>
  );
}
