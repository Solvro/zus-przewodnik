"use client";

import * as A from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

/** Dostępny akordeon (Radix): klawiatura, aria-expanded, płynne rozwijanie. */
export function Accordion({ items, defaultOpen }: { items: { id: string; title: React.ReactNode; body: React.ReactNode }[]; defaultOpen?: string }) {
  return (
    <A.Root type="multiple" defaultValue={defaultOpen ? [defaultOpen] : []} className="grid gap-2">
      {items.map((it) => (
        <A.Item key={it.id} value={it.id} className="overflow-hidden rounded-ui border border-line bg-surface">
          <A.Header>
            <A.Trigger className="group flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left font-bold text-navy hover:bg-primary-50">
              {it.title}
              <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </A.Trigger>
          </A.Header>
          <A.Content className="px-4 pb-4 pt-1 text-[0.95rem]">{it.body}</A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
