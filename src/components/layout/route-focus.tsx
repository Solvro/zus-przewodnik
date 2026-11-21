"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Po przejściu na inną stronę przenosi fokus na główną treść,
 * żeby czytnik ekranu ogłosił nową stronę (focus-on-route-change, WCAG).
 */
export function RouteFocus() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const main = document.getElementById("tresc");
    const heading = main?.querySelector<HTMLElement>("h1");
    const target = heading ?? main;
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: false });
  }, [pathname]);
  return null;
}
