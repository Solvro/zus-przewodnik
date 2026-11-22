"use client";

import { useEffect, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, History, Loader2, Lock, Play, RotateCcw, Save, SlidersHorizontal, ToggleRight, XCircle } from "lucide-react";
import { FEATURES, type FeatureFlags } from "@/content/features";
import { featureKeys, useFeatures } from "@/lib/api/queries";
import type { LegalParams } from "@/engine";
import { api } from "@/lib/api/client";
import { cn, dateShort, zl } from "@/lib/utils";
import { Badge, Button, Callout, Card, CardHeader, Field, Input, Select, Toggle } from "@/components/ui/primitives";
import { NumberInput } from "@/components/ui/number-input";

/** Edytowalne parametry (ścieżka w obiekcie, etykieta, jednostka) — reszta zmienia się przez API. */
const EDITABLE: { path: string; label: string; unit: string; hint?: string }[] = [
  { path: "minWage", label: "Minimalne wynagrodzenie", unit: "zł", hint: "Wpływa na minimalną podstawę i próg zaległości 1%" },
  { path: "forecastAvgWage", label: "Prognozowane przeciętne wynagrodzenie", unit: "zł", hint: "Najniższa podstawa JDG = 60%" },
  { path: "voluntarySicknessMaxBase", label: "Maks. podstawa dobrowolnej składki chorobowej", unit: "zł" },
  { path: "parentalBenefitFloor", label: "Świadczenie rodzicielskie (minimalny zasiłek)", unit: "zł" },
  { path: "rates.maternity", label: "Stawka: macierzyński / ojcowski / uzupełniający", unit: "×" },
  { path: "rates.parental", label: "Stawka: rodzicielski", unit: "×" },
  { path: "rates.averaged", label: "Stawka: wariant uśredniony", unit: "×" },
  { path: "parentalWeeks.single", label: "Rodzicielski — 1 dziecko", unit: "tyg." },
  { path: "parentalWeeks.multiple", label: "Rodzicielski — 2+ dzieci", unit: "tyg." },
  { path: "parentalExclusiveWeeks", label: "Nieprzenoszalna część rodzicielskiego", unit: "tyg." },
  { path: "paternityWeeks", label: "Urlop ojcowski", unit: "tyg." },
  { path: "largePayerThreshold", label: "Próg dużego płatnika (wypłaca sam powyżej)", unit: "os." },
];

const get = (o: LegalParams, path: string) => path.split(".").reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], o) as number;

interface AdminData {
  sets: LegalParams[];
  audit: { at: string; who: string; action: string; details: string }[];
}
interface Regression {
  paramsId: string;
  passed: number;
  total: number;
  rows: { id: string; title: string; expected: { outcome: string; monthlyAmount: number | null }; computedOutcome: string; computedAmount: number | null; pass: boolean; diff: number | null }[];
}

function readToken() {
  try {
    return sessionStorage.getItem("admin-token") ?? "";
  } catch {
    return "";
  }
}

export function AdminView() {
  const [token, setToken] = useState("");
  const [draft, setDraft] = useState("");
  // Odczyt po zamontowaniu — render serwera i pierwszy render klienta są identyczne
  useEffect(() => setToken(readToken()), []);
  const qc = useQueryClient();
  const headers = { "x-admin-token": token };

  const data = useQuery({
    queryKey: ["admin", "parameters", token],
    queryFn: () => api<AdminData>("/api/v1/admin/parameters", { headers }),
    enabled: !!token,
    retry: false,
  });

  if (!token || data.isError) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="flex items-center gap-2 text-3xl font-black text-navy"><Lock aria-hidden className="size-7" /> Panel administracyjny</h1>
        <p className="mt-2 text-muted">Zarządzanie parametrami prawnymi i testy regresji. W wersji demonstracyjnej token to <code className="rounded bg-canvas px-1">demo-admin</code>.</p>
        {data.isError && <Callout tone="danger" className="mt-4" title="Nieprawidłowy token" />}
        <form
          className="mt-6 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              sessionStorage.setItem("admin-token", draft);
            } catch {
              /* ignoruj */
            }
            setToken(draft);
          }}
        >
          <Field label="Token administratora" htmlFor="token">
            <Input id="token" type="password" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="current-password" />
          </Field>
          <Button type="submit" disabled={!draft}>Zaloguj</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black text-navy">Panel administracyjny</h1>
      <p className="mt-1 text-muted">Parametry prawne są wersjonowane datą obowiązywania — silnik sam wybiera zestaw właściwy dla daty porodu lub przyjęcia dziecka.</p>
      {data.isPending ? (
        <div className="mt-6 h-64 animate-pulse rounded-card bg-line/50" />
      ) : (
        <Tabs.Root defaultValue="params" className="mt-6">
          <Tabs.List aria-label="Sekcje panelu" className="flex gap-1 overflow-x-auto border-b-2 border-line">
            {[
              { id: "params", label: "Parametry", Icon: SlidersHorizontal },
              { id: "features", label: "Moduły", Icon: ToggleRight },
              { id: "regression", label: "Regresja spraw", Icon: Play },
              { id: "audit", label: "Dziennik zmian", Icon: History },
            ].map(({ id, label, Icon }) => (
              <Tabs.Trigger key={id} value={id} className="relative inline-flex min-h-11 items-center gap-2 px-3 font-bold text-muted data-[state=active]:text-primary-strong data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:-bottom-[2px] data-[state=active]:after:h-[3px] data-[state=active]:after:bg-primary">
                <Icon aria-hidden className="size-4" /> {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Tabs.Content value="params" className="pt-6 outline-none">
            <ParamsTab sets={data.data!.sets} headers={headers} onSaved={() => {
              void qc.invalidateQueries({ queryKey: ["admin"] });
              void qc.invalidateQueries({ queryKey: ["calculate"] });
              void qc.invalidateQueries({ queryKey: ["parameters"] });
            }} />
          </Tabs.Content>
          <Tabs.Content value="features" className="pt-6 outline-none">
            <FeaturesTab headers={headers} onSaved={() => void qc.invalidateQueries({ queryKey: ["admin"] })} />
          </Tabs.Content>
          <Tabs.Content value="regression" className="pt-6 outline-none">
            <RegressionTab sets={data.data!.sets} headers={headers} />
          </Tabs.Content>
          <Tabs.Content value="audit" className="pt-6 outline-none">
            <ul className="grid gap-2">
              {data.data!.audit.length === 0 && <li className="text-muted">Brak zmian — używane są parametry domyślne.</li>}
              {data.data!.audit.map((a, i) => (
                <li key={i} className="rounded-ui border border-line bg-surface p-3 text-sm">
                  <p className="font-bold">{a.action}</p>
                  <p className="text-muted">{new Date(a.at).toLocaleString("pl-PL")} · {a.who} · {a.details}</p>
                </li>
              ))}
            </ul>
          </Tabs.Content>
        </Tabs.Root>
      )}
    </div>
  );
}

function ParamsTab({ sets, headers, onSaved }: { sets: LegalParams[]; headers: Record<string, string>; onSaved: () => void }) {
  const current = sets.at(-1)!;
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(EDITABLE.map((e) => [e.path, get(current, e.path)])));
  const [meta, setMeta] = useState({ id: `pl-${new Date().getFullYear() + 1}-01-01`, label: `Stan prawny ${new Date().getFullYear() + 1}`, validFrom: `${new Date().getFullYear() + 1}-01-01`, who: "administrator" });
  const changes = Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== get(current, k)));

  const save = useMutation({
    mutationFn: () => api<{ ok: boolean }>("/api/v1/admin/parameters", { json: { ...meta, basedOn: current.id, changes }, headers }),
    onSuccess: onSaved,
  });
  const reset = useMutation({
    mutationFn: () => api<{ ok: boolean }>("/api/v1/admin/parameters", { method: "DELETE", headers }),
    onSuccess: onSaved,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card>
        <CardHeader title="Nowa wersja parametrów" description={`Na bazie: ${current.label} (${current.id}). Zmień wartości i ustaw datę obowiązywania.`} />
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          {EDITABLE.map((e) => (
            <Field key={e.path} label={e.label} htmlFor={`p-${e.path}`} hint={e.hint}>
              <NumberInput id={`p-${e.path}`} value={values[e.path]} min={0} onChange={(v) => v !== undefined && setValues((x) => ({ ...x, [e.path]: v }))} suffix={e.unit} />
            </Field>
          ))}
        </div>
      </Card>
      <div className="grid content-start gap-6">
        <Card className="p-5">
          <h2 className="font-bold text-navy">Publikacja</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Identyfikator" htmlFor="m-id"><Input id="m-id" value={meta.id} onChange={(e) => setMeta({ ...meta, id: e.target.value })} /></Field>
            <Field label="Nazwa" htmlFor="m-label"><Input id="m-label" value={meta.label} onChange={(e) => setMeta({ ...meta, label: e.target.value })} /></Field>
            <Field label="Obowiązuje od" htmlFor="m-from" hint="Zdarzenia (poród, przyjęcie dziecka) od tej daty liczone są nowymi parametrami."><Input id="m-from" type="date" value={meta.validFrom} onChange={(e) => setMeta({ ...meta, validFrom: e.target.value })} /></Field>
            <Field label="Kto zmienia" htmlFor="m-who"><Input id="m-who" value={meta.who} onChange={(e) => setMeta({ ...meta, who: e.target.value })} /></Field>
            <p className="text-sm text-muted">Zmienione pola: {Object.keys(changes).length ? Object.keys(changes).join(", ") : "brak"}</p>
            {save.isError && <p role="alert" className="text-sm font-bold text-danger">{save.error.message}</p>}
            {save.isSuccess && <Callout tone="success" title="Opublikowano nową wersję">Sprawdź skutki w zakładce „Regresja spraw”.</Callout>}
            <Button onClick={() => save.mutate()} disabled={!Object.keys(changes).length || save.isPending}>
              {save.isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />} Opublikuj wersję
            </Button>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-navy">Wersje</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {sets.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-ui bg-canvas p-2">
                <span><strong>{p.id}</strong> · {p.label}</span>
                <Badge tone={p.validTo === null ? "success" : "neutral"}>{dateShort(p.validFrom)} – {p.validTo ? dateShort(p.validTo) : "obecnie"}</Badge>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="mt-3 text-danger" onClick={() => { if (window.confirm("Przywrócić parametry domyślne i usunąć wszystkie wersje?")) reset.mutate(); }}>
            <RotateCcw aria-hidden className="size-4" /> Przywróć domyślne
          </Button>
        </Card>
      </div>
    </div>
  );
}

function RegressionTab({ sets, headers }: { sets: LegalParams[]; headers: Record<string, string> }) {
  const [paramsId, setParamsId] = useState(sets.at(-1)?.id ?? "");
  const q = useQuery({
    queryKey: ["admin", "regression", paramsId],
    queryFn: () => api<Regression>(`/api/v1/admin/regression?paramsId=${encodeURIComponent(paramsId)}`, { headers }),
  });
  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Zestaw parametrów" htmlFor="reg-set">
          <Select id="reg-set" value={paramsId} onChange={(e) => setParamsId(e.target.value)}>
            {sets.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.label}</option>)}
          </Select>
        </Field>
        {q.data && <Badge tone={q.data.passed === q.data.total ? "success" : "danger"} className="mb-3 text-sm">{q.data.passed}/{q.data.total} zgodnych z rozstrzygnięciem</Badge>}
      </div>
      {q.isPending ? <div className="mt-4 h-48 animate-pulse rounded-ui bg-line/50" /> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b-2 border-line text-left text-muted">
              <tr><th scope="col" className="py-2 pr-3">Sprawa</th><th scope="col" className="py-2 pr-3">Rozstrzygnięcie</th><th scope="col" className="py-2 pr-3">Silnik</th><th scope="col" className="py-2">Wynik</th></tr>
            </thead>
            <tbody>
              {q.data?.rows.map((r) => (
                <tr key={r.id} className="border-b border-line">
                  <td className="py-2 pr-3"><strong>{r.id}</strong> {r.title}</td>
                  <td className="py-2 pr-3 tabular">{r.expected.outcome === "granted" ? "przyznano" : "odmowa"}{r.expected.monthlyAmount !== null ? ` · ${zl(r.expected.monthlyAmount)}` : ""}</td>
                  <td className="py-2 pr-3 tabular">{r.computedOutcome === "granted" ? "przysługuje" : "nie przysługuje"}{r.computedAmount !== null ? ` · ${zl(r.computedAmount)}` : ""}</td>
                  <td className="py-2">
                    <span className={cn("inline-flex items-center gap-1 font-bold", r.pass ? "text-primary" : "text-danger")}>
                      {r.pass ? <CheckCircle2 aria-hidden className="size-4" /> : <XCircle aria-hidden className="size-4" />}
                      {r.pass ? "zgodne" : `różnica ${r.diff !== null ? zl(r.diff) : "w prawie"}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Włączanie i wyłączanie modułów aplikacji (np. wdrażanie nowych funkcji etapami). */
function FeaturesTab({ headers, onSaved }: { headers: Record<string, string>; onSaved: () => void }) {
  const qc = useQueryClient();
  const features = useFeatures();
  const save = useMutation({
    mutationFn: (patch: Partial<FeatureFlags>) => api<FeatureFlags>("/api/v1/admin/features", { json: patch, headers }),
    onSuccess: (next) => {
      qc.setQueryData(featureKeys.all, next);
      onSaved();
    },
  });
  return (
    <Card>
      <CardHeader
        title="Moduły aplikacji"
        description="Wyłączony moduł znika z nawigacji, a jego strona i API zwracają informację o wyłączeniu. Zmiany trafiają do dziennika."
      />
      <div className="grid gap-5 px-5 pb-5">
        {FEATURES.map((f) => (
          <Toggle
            key={f.key}
            id={`feat-${f.key}`}
            checked={features[f.key]}
            onChange={(v) => save.mutate({ [f.key]: v })}
            label={f.label}
            description={f.href}
          />
        ))}
        {save.isError && <Callout tone="danger" title="Nie udało się zapisać zmiany" />}
      </div>
    </Card>
  );
}
