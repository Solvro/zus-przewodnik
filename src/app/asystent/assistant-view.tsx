"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, Loader2, RotateCcw, Send, User } from "lucide-react";
import { rehydrateScenario, useScenario, useScenarioTouched } from "@/lib/scenario-store";
import { AiBadge, Badge, Button, Callout, inputClass } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface Citation {
  document: string;
  text: string;
}
interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  ai?: boolean;
  error?: boolean;
}

const SUGGESTIONS = [
  "Czy dostanę zasiłek, jeśli moja umowa skończy się przed porodem?",
  "Czym różni się wariant 81,5% od 100% + 70%?",
  "Kiedy najpóźniej mam złożyć wniosek o urlop rodzicielski?",
  "Czy tata może przejąć część urlopu macierzyńskiego?",
  "Co mi przysługuje po poronieniu?",
];

/** Strumień NDJSON z /api/v1/assistant — aktualizuje ostatnią wiadomość na bieżąco. */
async function streamChat(
  messages: Msg[],
  scenario: unknown,
  onDelta: (text: string) => void,
): Promise<{ citations: Citation[]; ai: boolean }> {
  const res = await fetch("/api/v1/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })), scenario }),
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.title ?? "Asystent jest chwilowo niedostępny.");
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let done: { citations: Citation[]; ai: boolean } = { citations: [], ai: true };
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const ev = JSON.parse(line) as { t: string; v?: string; citations?: Citation[]; ai?: boolean };
      if (ev.t === "text" && ev.v) onDelta(ev.v);
      if (ev.t === "done") done = { citations: ev.citations ?? [], ai: ev.ai ?? true };
      if (ev.t === "error") throw new Error(ev.v ?? "Błąd asystenta.");
    }
  }
  return done;
}

export function AssistantView() {
  useEffect(rehydrateScenario, []);
  const scenario = useScenario();
  const touched = useScenarioTouched();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const chat = useMutation({
    mutationFn: async (history: Msg[]) =>
      streamChat(history, touched ? scenario : undefined, (delta) =>
        setMessages((m) => {
          const last = m.at(-1)!;
          return [...m.slice(0, -1), { ...last, content: last.content + delta }];
        }),
      ),
    onSuccess: (meta) => setMessages((m) => [...m.slice(0, -1), { ...m.at(-1)!, citations: meta.citations, ai: meta.ai }]),
    onError: (e) => setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: e.message, error: true }]),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, chat.isPending]);

  function ask(q: string) {
    const text = q.trim();
    if (!text || chat.isPending) return;
    const history: Msg[] = [...messages.filter((m) => !m.error), { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    chat.mutate(history);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-3xl font-black text-navy">Asystent <AiBadge /></h1>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={chat.isPending}>
            <RotateCcw aria-hidden className="size-4" /> Nowa rozmowa
          </Button>
        )}
      </div>
      <p className="mt-1 text-muted">
        Odpowiadam na podstawie poradnika ZUS i przepisów — z odnośnikami do źródeł. {touched ? "Znam Twój plan, więc mogę odnieść się do Twoich dat i kwot." : "Wypełnij kalkulator, a odniosę się też do Twoich dat i kwot."}
      </p>

      {messages.length === 0 && (
        <div className="mt-6">
          <p className="text-sm font-bold">Przykładowe pytania</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => ask(s)} className="min-h-11 rounded-full border-2 border-line bg-surface px-4 py-2 text-left text-sm font-bold text-ink hover:border-primary">
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="mt-6 grid gap-4" aria-label="Rozmowa" aria-live="polite">
        {messages.map((m, i) => (
          <li key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <span aria-hidden className={cn("mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full", m.role === "user" ? "bg-navy text-white" : "bg-primary text-white")}>
              {m.role === "user" ? <User className="size-4" /> : <BookOpen className="size-4" />}
            </span>
            <div className={cn("min-w-0 max-w-[85%] rounded-card px-4 py-3", m.role === "user" ? "bg-navy-50" : m.error ? "bg-danger-50" : "border border-line bg-surface")}>
              <p className="sr-only">{m.role === "user" ? "Ty:" : "Asystent:"}</p>
              {m.content ? (
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              ) : (
                <span className="flex items-center gap-2 text-muted"><Loader2 aria-hidden className="size-4 animate-spin" /> Szukam w przepisach…</span>
              )}
              {m.ai === false && <Badge tone="warning" className="mt-2">tryb bez AI — dopasowanie z bazy wiedzy</Badge>}
              {m.citations && m.citations.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="inline-flex min-h-9 cursor-pointer items-center font-bold text-primary">Źródła ({m.citations.length})</summary>
                  <ul className="mt-2 grid gap-2">
                    {m.citations.map((c, j) => (
                      <li key={j} className="rounded-ui border-l-4 border-l-primary bg-canvas p-2">
                        <p className="text-xs font-bold text-muted">{c.document}</p>
                        <p className="mt-0.5">„{c.text}”</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div ref={endRef} />

      <form
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-6 flex items-end gap-2 rounded-card border border-line bg-surface p-2 shadow-card md:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <label htmlFor="q" className="sr-only">Twoje pytanie</label>
        <textarea
          id="q"
          rows={1}
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter wysyła, Shift+Enter = nowa linia; nie przerywamy kompozycji IME
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              ask(input);
            }
          }}
          placeholder="Zadaj pytanie o zasiłek, urlop lub dokumenty…"
          className={cn(inputClass, "max-h-40 min-h-11 resize-none py-2")}
        />
        <Button type="submit" disabled={!input.trim() || chat.isPending} aria-label="Wyślij pytanie" className="shrink-0">
          {chat.isPending ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <Send aria-hidden className="size-5" />}
        </Button>
      </form>
      <Callout tone="neutral" className="mt-4" title="Asystent może się mylić">
        Odpowiedzi mają charakter informacyjny. Wiążącą decyzję wydaje ZUS lub płatnik składek. Nie podawaj w pytaniach danych medycznych ani numeru PESEL.
      </Callout>
    </div>
  );
}
