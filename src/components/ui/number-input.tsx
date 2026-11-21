"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "./primitives";

/** Pole kwoty/liczby akceptujące polski przecinek; zatwierdza poprawną wartość na bieżąco. */
export function NumberInput({
  id,
  value,
  onChange,
  suffix,
  min,
  max,
  className,
  ...rest
}: {
  id: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  min?: number;
  max?: number;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "min" | "max">) {
  const [text, setText] = useState(value === undefined ? "" : String(value).replace(".", ","));
  const [lastValue, setLastValue] = useState(value);
  // Synchronizacja, gdy wartość zmieni się z zewnątrz (np. wczytanie danych z ZUS) — bez efektu
  if (value !== lastValue) {
    setLastValue(value);
    const parsed = Number(text.replace(/\s/g, "").replace(",", "."));
    if (value !== parsed) setText(value === undefined ? "" : String(value).replace(".", ","));
  }
  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          if (t.trim() === "") return onChange(undefined);
          const n = Number(t.replace(/\s/g, "").replace(",", "."));
          if (Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max)) {
            setLastValue(n);
            onChange(n);
          }
        }}
        className={cn(inputClass, suffix && "pr-14")}
        {...rest}
      />
      {suffix && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}
