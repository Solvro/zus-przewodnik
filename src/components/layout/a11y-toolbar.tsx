"use client";

import { useEffect, useState } from "react";
import { Contrast } from "lucide-react";
import { cn } from "@/lib/utils";

type FontSize = "md" | "lg" | "xl";

const FONT_LABELS: Record<FontSize, string> = {
  md: "Tekst standardowy",
  lg: "Tekst większy",
  xl: "Tekst największy",
};
const FONT_TEXT: Record<FontSize, string> = { md: "A", lg: "A+", xl: "A++" };
const FONT_SIZE: Record<FontSize, string> = { md: "text-sm", lg: "text-base", xl: "text-lg" };
const FONTS = ["md", "lg", "xl"] as const;

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* tryb prywatny / zablokowane dane — ustawienie działa do końca sesji */
  }
}

/**
 * Skrypt uruchamiany w <head> przed renderem — ustawia rozmiar tekstu i kontrast
 * bez migania (vercel-react-best-practices: rendering-hydration-no-flicker).
 */
export const A11Y_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var f=localStorage.getItem('a11y-font');if(f==='lg'||f==='xl')d.setAttribute('data-font',f);if(localStorage.getItem('a11y-contrast')==='high')d.setAttribute('data-contrast','high');}catch(e){}})();`;

/** Przełączniki rozmiaru tekstu i wysokiego kontrastu. */
export function A11yToolbar({ compact = false }: { compact?: boolean }) {
  const [font, setFont] = useState<FontSize>("md");
  const [contrast, setContrast] = useState(false);

  // Synchronizacja stanu przycisków z atrybutami ustawionymi już przez skrypt startowy.
  useEffect(() => {
    const d = document.documentElement;
    setFont((d.getAttribute("data-font") as FontSize | null) ?? "md");
    setContrast(d.getAttribute("data-contrast") === "high");
  }, []);

  // Zmiany zapisujemy w handlerach, nie w efektach (rerender-move-effect-to-event).
  function chooseFont(f: FontSize) {
    setFont(f);
    const d = document.documentElement;
    if (f === "md") d.removeAttribute("data-font");
    else d.setAttribute("data-font", f);
    persist("a11y-font", f);
  }

  function toggleContrast() {
    const next = !contrast;
    setContrast(next);
    const d = document.documentElement;
    if (next) d.setAttribute("data-contrast", "high");
    else d.removeAttribute("data-contrast");
    persist("a11y-contrast", next ? "high" : "normal");
  }

  const next: Record<FontSize, FontSize> = { md: "lg", lg: "xl", xl: "md" };

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Ustawienia dostępności">
      {compact ? (
        // Na telefonie jeden przycisk przełączający rozmiar (mniej miejsca, ten sam efekt)
        <button
          type="button"
          onClick={() => chooseFont(next[font])}
          aria-label={`${FONT_TEXT[font]} — rozmiar tekstu: ${FONT_LABELS[font].toLowerCase()}, zmień na: ${FONT_LABELS[next[font]].toLowerCase()}`}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-ui font-black text-navy hover:bg-navy-50",
            font !== "md" && "bg-navy-50 ring-2 ring-navy/30",
          )}
        >
          <span aria-hidden>{FONT_TEXT[font]}</span>
        </button>
      ) : (
        FONTS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => chooseFont(f)}
            aria-pressed={font === f}
            // WCAG 2.5.3: nazwa dostępna zaczyna się od widocznego tekstu („A+”)
            aria-label={`${FONT_TEXT[f]} — ${FONT_LABELS[f].toLowerCase()}`}
            title={FONT_LABELS[f]}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-ui font-black text-navy hover:bg-navy-50",
              FONT_SIZE[f],
              font === f && "bg-navy-50 ring-2 ring-navy/30",
            )}
          >
            <span aria-hidden>{FONT_TEXT[f]}</span>
          </button>
        ))
      )}
      <button
        type="button"
        onClick={toggleContrast}
        aria-pressed={contrast}
        aria-label={compact ? "Wysoki kontrast" : undefined}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-ui px-2 text-sm font-bold text-navy hover:bg-navy-50",
          contrast && "bg-navy-50 ring-2 ring-navy/30",
        )}
      >
        <Contrast aria-hidden className="size-5" />
        {!compact && <span>Kontrast</span>}
      </button>
    </div>
  );
}
