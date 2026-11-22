import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Znak Rodzicownika: litera „R” (rodzic), w której „brzuszku” bezpiecznie mieści się
 * bursztynowa kropka — dziecko. Zieleń i bursztyn z identyfikacji ZUS.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="48" height="48" rx="13" fill="var(--c-logo-bg, #007834)" />
      <path
        d="M16 36V12h9.5a7.5 7.5 0 0 1 0 15H16"
        fill="none"
        stroke="var(--c-logo-fg, #FBF7F0)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 27l9 9" stroke="var(--c-logo-fg, #FBF7F0)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="24.5" cy="19.5" r="3.2" fill="var(--c-logo-dot, #FAB856)" />
    </svg>
  );
}

export function Logo({ inverted = false, tagline = true }: { inverted?: boolean; tagline?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 rounded-ui py-1">
      <LogoMark className="size-9 transition-transform duration-200 group-hover:-rotate-6" />
      <span className="leading-none">
        <span className={cn("font-display block text-[1.35rem] font-semibold tracking-[-0.01em]", inverted ? "text-paper" : "text-navy")}>
          Rodzicownik<span className="sr-only"> — strona główna</span>
        </span>
        {tagline && (
          <span
            className={cn(
              "mt-0.5 hidden text-[0.72rem] font-bold min-[400px]:block",
              inverted ? "text-paper/80" : "text-muted",
            )}
          >
            urlopy i zasiłki z ZUS, policzone dla Ciebie
          </span>
        )}
      </span>
    </Link>
  );
}
