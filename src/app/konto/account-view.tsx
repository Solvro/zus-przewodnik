"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Baby, Building2, CheckCircle2, FileHeart, Inbox, Loader2, LogOut, Mail, Printer, Receipt, Send, Stethoscope } from "lucide-react";
import { rehydrateSession, sessionActions, useSession } from "@/lib/session";
import { rehydrateScenario, useScenario } from "@/lib/scenario-store";
import { useAskPueMutation, useDebtQuery, useEzlaQuery, useInsuredQuery, usePueMessagesQuery, useRscMutation } from "@/lib/api/queries";
import { cn, dateShort, zl } from "@/lib/utils";
import { Badge, Button, ButtonLink, Callout, Card, Field, Input, Select, inputClass } from "@/components/ui/primitives";
import { Term } from "@/components/ui/term";

const TABS = [
  { id: "insurance", label: "Ubezpieczenie", Icon: Building2 },
  { id: "ezla", label: "Zwolnienia e-ZLA", Icon: Stethoscope },
  { id: "debt", label: "Zaświadczenie o składkach", Icon: Receipt },
  { id: "inbox", label: "Skrzynka eZUS", Icon: Inbox },
  { id: "rsc", label: "Akt urodzenia", Icon: Baby },
] as const;

export function AccountView() {
  useEffect(() => {
    rehydrateSession();
    rehydrateScenario();
  }, []);
  const { user, hydrated } = useSession();
  const router = useRouter();
  const qc = useQueryClient();

  if (!hydrated) return <div className="mx-auto mt-10 h-64 max-w-5xl animate-pulse rounded-card bg-line/50" aria-label="Wczytywanie" />;
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-black text-navy">Moje konto</h1>
        <p className="mt-2 text-muted">Zaloguj się przez mObywatel, aby zobaczyć dane z ZUS: ubezpieczenie, zwolnienia lekarskie i stan składek.</p>
        <ButtonLink href="/logowanie" size="lg" className="mt-6">Zaloguj się</ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy">{user.firstName} {user.lastName}</h1>
          <p className="text-muted">PESEL {user.peselMasked} · <Term id="eZUS">eZUS</Term> — symulacja połączenia</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            sessionActions.logout();
            qc.removeQueries({ queryKey: ["mock"] });
            router.push("/");
          }}
        >
          <LogOut aria-hidden className="size-4" /> Wyloguj
        </Button>
      </div>

      <Tabs.Root defaultValue="insurance" className="mt-6">
        <Tabs.List aria-label="Sekcje konta" className="-mx-1 flex gap-1 overflow-x-auto border-b-2 border-line px-1 pb-px">
          {TABS.map(({ id, label, Icon }) => (
            <Tabs.Trigger
              key={id}
              value={id}
              className="relative inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3 font-bold text-muted hover:text-ink data-[state=active]:text-primary-strong data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-[2px] data-[state=active]:after:h-[3px] data-[state=active]:after:bg-primary"
            >
              <Icon aria-hidden className="size-4" /> {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="insurance" className="pt-6 outline-none"><InsuranceTab id={user.personaId} /></Tabs.Content>
        <Tabs.Content value="ezla" className="pt-6 outline-none"><EzlaTab id={user.personaId} /></Tabs.Content>
        <Tabs.Content value="debt" className="pt-6 outline-none"><DebtTab id={user.personaId} /></Tabs.Content>
        <Tabs.Content value="inbox" className="pt-6 outline-none"><InboxTab id={user.personaId} /></Tabs.Content>
        <Tabs.Content value="rsc" className="pt-6 outline-none"><RscTab /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function Loading() {
  return <div className="grid gap-3" aria-label="Wczytywanie">{Array.from({ length: 2 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-ui bg-line/60" />)}</div>;
}

function InsuranceTab({ id }: { id: string }) {
  const q = useInsuredQuery(id);
  if (q.isPending) return <Loading />;
  if (q.isError) return <Callout tone="danger" title="Nie udało się pobrać danych z ZUS"><Button size="sm" variant="secondary" className="mt-2" onClick={() => q.refetch()}>Spróbuj ponownie</Button></Callout>;
  return (
    <div>
      <p className="text-sm text-muted">Stan na {dateShort(q.data.asOf)} · {q.data.source}</p>
      <ul className="mt-3 grid gap-3">
        {q.data.insurance.map((i) => (
          <li key={i.payerNip + i.from}>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-navy">{i.title}</p>
                  <p className="text-muted">{i.payerName} · NIP {i.payerNip}</p>
                </div>
                <Badge tone={i.sickness === "brak" ? "danger" : "success"}><BadgeCheck aria-hidden className="size-3.5" /> chorobowe {i.sickness}</Badge>
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-muted">Okres</dt><dd className="font-bold tabular">{dateShort(i.from)} – {i.to ? dateShort(i.to) : "obecnie"}</dd></div>
                <div><dt className="text-muted">Podstawa składek (ostatni miesiąc)</dt><dd className="font-bold tabular">{zl(i.contributionBase)}</dd></div>
                <div><dt className="text-muted">Płatnik zgłasza</dt><dd className="font-bold">{i.payerInsuredCount === null ? "— (samozatrudnienie)" : `${i.payerInsuredCount} osób → zasiłek wypłaci ${i.payerInsuredCount > 20 ? "płatnik" : "ZUS"}`}</dd></div>
              </dl>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EzlaTab({ id }: { id: string }) {
  const q = useEzlaQuery(id);
  if (q.isPending) return <Loading />;
  if (q.isError) return <Callout tone="danger" title="Nie udało się pobrać zwolnień" />;
  if (!q.data.items.length) return <Callout tone="neutral" title="Brak zwolnień lekarskich">Gdy lekarz wystawi e-ZLA, pojawi się tutaj automatycznie.</Callout>;
  return (
    <ul className="grid gap-3">
      {q.data.items.map((z) => (
        <li key={z.series}>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-bold text-navy">Zaświadczenie {z.series}</p>
              <p className="text-sm text-muted">{z.doctor} · status: {z.status}</p>
            </div>
            <p className="font-bold tabular">{dateShort(z.from)} – {dateShort(z.to)}</p>
            {z.code === "B" && <Badge tone="info">kod B — ciąża, zasiłek 100%</Badge>}
          </Card>
        </li>
      ))}
    </ul>
  );
}

function DebtTab({ id }: { id: string }) {
  const s = useScenario();
  const defaultDate = (s.event === "adoption" || s.event === "foster" ? s.placementDate : s.birthDate ?? s.dueDate) ?? new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(defaultDate);
  const [requested, setRequested] = useState(false);
  const q = useDebtQuery(id, date, requested);
  return (
    <div className="grid gap-5">
      <p className="prose-zus text-muted">
        Osoby prowadzące działalność dostaną zasiłek, tylko jeśli w dniu powstania prawa (np. w dniu porodu) zaległość w składkach nie przekracza 1% minimalnego wynagrodzenia.
      </p>
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); setRequested(true); }}>
        <Field label="Stan na dzień" htmlFor="debt-date">
          <Input id="debt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button type="submit" disabled={q.isFetching}>{q.isFetching ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Receipt aria-hidden className="size-4" />} Wystaw zaświadczenie</Button>
      </form>
      {q.data && (
        <Card className="p-6 print:shadow-none" id="certificate">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Zaświadczenie (symulacja)</p>
              <p className="text-lg font-bold text-navy">o stanie rozliczeń z tytułu składek</p>
              <p className="text-sm text-muted">Nr {q.data.certificateNo} · wystawione {dateShort(q.data.issuedAt)} · stan na {dateShort(q.data.asOf)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer aria-hidden className="size-4" /> Drukuj / PDF</Button>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-ui bg-canvas p-3"><dt className="text-sm text-muted">Zaległość</dt><dd className="text-xl font-black tabular">{zl(q.data.debt)}</dd></div>
            <div className="rounded-ui bg-canvas p-3"><dt className="text-sm text-muted">Próg (1% min. wynagrodzenia)</dt><dd className="text-xl font-black tabular">{zl(q.data.threshold)}</dd></div>
            <div className={cn("rounded-ui p-3", q.data.blocksBenefit ? "bg-danger-50" : "bg-primary-50")}>
              <dt className="text-sm text-muted">Wpływ na zasiłek</dt>
              <dd className="text-lg font-black">{!q.data.applies ? "Nie dotyczy" : q.data.blocksBenefit ? "Blokuje wypłatę" : "Nie blokuje"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm">{q.data.note}</p>
        </Card>
      )}
    </div>
  );
}

function InboxTab({ id }: { id: string }) {
  const q = usePueMessagesQuery(id);
  const ask = useAskPueMutation();
  const [topic, setTopic] = useState("Zasiłek macierzyński");
  const [text, setText] = useState("");
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section aria-labelledby="msgs">
        <h2 id="msgs" className="mb-3 font-bold text-navy">Wiadomości</h2>
        {q.isPending ? <Loading /> : (
          <ul className="grid gap-2">
            {q.data?.map((m) => (
              <li key={m.id} className={cn("rounded-ui border bg-surface p-4", m.unread ? "border-primary" : "border-line")}>
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <Mail aria-hidden className="size-4" /> {m.from} · {dateShort(m.date)} {m.unread && <Badge tone="success">nowa</Badge>}
                </p>
                <p className="mt-1 font-bold">{m.subject}</p>
                <p className="text-sm">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="ask">
        <h2 id="ask" className="mb-3 font-bold text-navy">Zadaj pytanie doradcy ZUS</h2>
        {ask.isSuccess ? (
          <Callout tone="success" icon={<CheckCircle2 className="size-5" />} title={`Wysłano — sprawa ${ask.data.caseNo}`}>
            {ask.data.message} Odpowiedź zwykle w ciągu {ask.data.expectedReplyDays} dni roboczych.
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => { ask.reset(); setText(""); }}>Zadaj kolejne pytanie</Button>
          </Callout>
        ) : (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); ask.mutate({ personaId: id, topic, text }); }}>
            <Field label="Temat" htmlFor="ask-topic">
              <Select id="ask-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option>Zasiłek macierzyński</option>
                <option>Zasiłek chorobowy w ciąży</option>
                <option>Ubezpieczenie i składki</option>
                <option>Inne</option>
              </Select>
            </Field>
            <Field label="Treść pytania" htmlFor="ask-text" hint="Nie podawaj danych medycznych — doradca widzi dane z Twojego konta." error={ask.isError ? "Nie udało się wysłać — sprawdź treść i spróbuj ponownie." : undefined}>
              <textarea id="ask-text" value={text} onChange={(e) => setText(e.target.value)} rows={5} required minLength={5} className={cn(inputClass, "py-2")} />
            </Field>
            <Button type="submit" disabled={ask.isPending || text.trim().length < 5}>
              {ask.isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />} Wyślij przez eZUS
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

function RscTab() {
  const rsc = useRscMutation();
  const s = useScenario();
  const [form, setForm] = useState({ kind: "skrocony" as "skrocony" | "zupelny", childFirstName: "", birthDate: s.birthDate ?? "", purpose: "zasiłek macierzyński" });
  return (
    <div className="max-w-xl">
      <p className="text-muted">
        Do wniosku o zasiłek nie musisz dołączać odpisu — ZUS lub pracodawca mogą pobrać go z rejestru stanu cywilnego. Jeśli potrzebujesz odpisu, zamów go tutaj (symulacja usługi gov.pl).
      </p>
      {rsc.isSuccess ? (
        <Callout tone="success" className="mt-5" icon={<FileHeart className="size-5" />} title={`Wniosek złożony — sprawa ${rsc.data.caseNo}`}>
          {rsc.data.delivery}
        </Callout>
      ) : (
        <form className="mt-5 grid gap-4" onSubmit={(e) => { e.preventDefault(); rsc.mutate(form); }}>
          <Field label="Rodzaj odpisu" htmlFor="rsc-kind">
            <Select id="rsc-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "skrocony" | "zupelny" })}>
              <option value="skrocony">Odpis skrócony aktu urodzenia</option>
              <option value="zupelny">Odpis zupełny aktu urodzenia</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Imię dziecka" htmlFor="rsc-name">
              <Input id="rsc-name" value={form.childFirstName} onChange={(e) => setForm({ ...form, childFirstName: e.target.value })} required autoComplete="off" />
            </Field>
            <Field label="Data urodzenia" htmlFor="rsc-date">
              <Input id="rsc-date" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} required />
            </Field>
          </div>
          <Field label="Cel" htmlFor="rsc-purpose">
            <Input id="rsc-purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </Field>
          {rsc.isError && <p role="alert" className="text-sm font-bold text-danger">Nie udało się złożyć wniosku — uzupełnij pola i spróbuj ponownie.</p>}
          <Button type="submit" disabled={rsc.isPending}>{rsc.isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />} Złóż wniosek (gov.pl — symulacja)</Button>
          <a className="text-sm text-primary underline underline-offset-4" href="https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego" target="_blank" rel="noreferrer">Prawdziwa usługa na gov.pl (otwiera się w nowej karcie)</a>
        </form>
      )}
    </div>
  );
}
