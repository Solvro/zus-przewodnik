"use client";

import * as Popover from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { GLOSSARY } from "@/content/glossary";

/**
 * Termin ze słowniczka. Otwierany kliknięciem/dotknięciem/klawiszem (nie tylko hover),
 * zamykany Esc lub przyciskiem — działa na telefonie i z czytnikiem ekranu.
 */
export function Term({ id, children }: { id: string; children?: React.ReactNode }) {
  const entry = GLOSSARY[id];
  if (!entry) return <>{children}</>;
  return (
    <Popover.Root>
      <Popover.Trigger
        className="cursor-help border-b-2 border-dotted border-primary/60 text-inherit [font:inherit] hover:border-primary"
        aria-label={`${typeof children === "string" ? children : entry.term} — wyjaśnienie`}
      >
        {children ?? entry.term}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          collisionPadding={16}
          className="z-50 max-w-xs rounded-ui bg-navy p-3 pr-9 text-sm text-white shadow-lg"
        >
          <p className="font-bold">{entry.term}</p>
          <p className="mt-0.5">{entry.short}</p>
          <Popover.Close
            className="absolute right-1 top-1 inline-flex size-8 items-center justify-center rounded-ui hover:bg-white/10"
            aria-label="Zamknij wyjaśnienie"
          >
            <X aria-hidden className="size-4" />
          </Popover.Close>
          <Popover.Arrow className="fill-navy" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
