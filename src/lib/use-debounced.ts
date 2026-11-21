"use client";

import { useEffect, useState } from "react";

/** Opóźnia wartość — ogranicza liczbę zapytań przy pisaniu (debounce-throttle). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
