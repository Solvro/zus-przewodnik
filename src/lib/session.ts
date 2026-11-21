"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface SessionUser {
  personaId: string;
  firstName: string;
  lastName: string;
  peselMasked: string;
}

interface SessionState {
  user: SessionUser | null;
  hydrated: boolean;
  login: (u: SessionUser) => void;
  logout: () => void;
}

/**
 * Symulowana sesja mObywatela. Trzymana w sessionStorage — znika po zamknięciu karty,
 * dane osobowe nie trafiają do trwałego magazynu (RODO).
 */
const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: "pr-session-v1", // client-localstorage-schema: wersjonowany klucz
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ user: s.user }),
      // Nawadniamy dopiero po zamontowaniu — pierwszy render klienta = render serwera (brak hydration mismatch)
      skipHydration: true,
      onRehydrateStorage: () => () => useSessionStore.setState({ hydrated: true }),
    },
  ),
);

/** Subskrypcja tylko potrzebnych pól (rerender-derived-state). */
export function useSession() {
  const user = useSessionStore((s) => s.user);
  const hydrated = useSessionStore((s) => s.hydrated);
  return { user, hydrated };
}

/** Jednorazowe nawodnienie sesji po stronie klienta (advanced-init-once). */
let rehydrated = false;
export function rehydrateSession() {
  if (rehydrated) return;
  rehydrated = true;
  void useSessionStore.persist.rehydrate();
}

export const sessionActions = {
  login: (u: SessionUser) => useSessionStore.getState().login(u),
  logout: () => useSessionStore.getState().logout(),
};
