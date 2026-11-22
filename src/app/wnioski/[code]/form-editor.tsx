"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Paperclip, Printer, Send } from "lucide-react";
import { findForm, type FormCtx, type FormDef } from "@/content/forms";
import { rehydrateScenario, useScenario } from "@/lib/scenario-store";
import { rehydrateSession, useSession } from "@/lib/session";
import { useCalculation } from "@/lib/use-calculation";
import { useSubmitMutation } from "@/lib/api/queries";
import { cn, dateShort } from "@/lib/utils";
import { Badge, Button, ButtonLink, Callout, Card, Field, Input, Select, inputClass } from "@/components/ui/primitives";

export function FormEditorView({ code }: { code: string }) {
  useEffect(() => {
    rehydrateScenario();
    rehydrateSession();
  }, []);
  const form = findForm(code)!;
  const s = useScenario();
  const { user, hydrated } = useSession();
  const { outcome } = useCalculation(s);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ButtonLink href="/wnioski" variant="link" className="no-print text-sm"><ArrowLeft aria-hidden className="size-4" /> Wszystkie wnioski</ButtonLink>
      <h1 className="mt-2 text-2xl font-black text-navy sm:text-3xl">{form.title}</h1>
      <p className="mt-1 text-sm text-muted">{form.legal}</p>
      {form.deadline && <Badge tone="warning" className="mt-2">Termin: {form.deadline}</Badge>}
      {outcome.ok || !outcome.pending ? (
        // Edytor startuje dopiero z danymi planu — klucz resetuje prefill przy zmianie scenariusza
        <FormEditor key={`${hydrated}-${outcome.ok ? outcome.result.eventDate : "none"}`} form={form} ctx={{ s, r: outcome.ok ? outcome.result : undefined, user }} />
      ) : (
        <div className="mt-6 h-96 animate-pulse rounded-card bg-line/50" aria-label="Wczytywanie" />
      )}
    </div>
  );
}

function FormEditor({ form, ctx }: { form: FormDef; ctx: FormCtx }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.fields.map((f) => [f.id, f.prefill?.(ctx) ?? (f.type === "select" ? f.options?.[0] ?? "" : "")])),
  );
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const submit = useSubmitMutation();

  const missing = form.fields.filter((f) => f.required && !values[f.id]?.trim());
  const statementsOk = form.statements.every((_, i) => checked[i]);
  const target: "employer" | "zus" | "payer" =
    form.to === "employer" ? "employer" : ctx.r?.payer.mother?.who === "payer" ? "payer" : "zus";
  const targetLabel = target === "employer" ? "do pracodawcy" : target === "payer" ? "do płatnika (pracodawcy/zleceniodawcy)" : "do ZUS przez eZUS";

  function send() {
    setAttempted(true);
    if (missing.length || !statementsOk) {
      document.getElementById("form-errors")?.focus();
      return;
    }
    submit.mutate({ formCode: form.code, to: target, payload: { ...values, statements: form.statements } });
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="no-print min-w-0 p-5">
        <h2 className="font-bold text-navy">Uzupełnij i sprawdź</h2>
        <p className="mt-1 text-sm text-muted">Pola wypełniliśmy na podstawie Twojego planu — popraw, jeśli coś się nie zgadza.</p>

        {attempted && (missing.length > 0 || !statementsOk) && (
          <div id="form-errors" tabIndex={-1} role="alert" className="mt-4 rounded-ui border-l-4 border-l-danger bg-danger-50 p-4 outline-none">
            <p className="font-bold">Popraw przed wysłaniem:</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {missing.map((f) => <li key={f.id}><a href={`#f-${f.id}`} className="underline">{f.label}</a></li>)}
              {!statementsOk && <li>Zaznacz wymagane oświadczenia</li>}
            </ul>
          </div>
        )}

        <div className="mt-4 grid gap-4">
          {form.fields.map((f) => {
            const err = attempted && f.required && !values[f.id]?.trim() ? "To pole jest wymagane." : undefined;
            const set = (v: string) => setValues((x) => ({ ...x, [f.id]: v }));
            return (
              <Field key={f.id} label={<>{f.label}{f.required && <span aria-hidden className="text-danger"> *</span>}</>} htmlFor={`f-${f.id}`} hint={f.hint} error={err}>
                {f.type === "select" ? (
                  <Select id={`f-${f.id}`} value={values[f.id]} onChange={(e) => set(e.target.value)} required={f.required}>
                    {f.options?.map((o) => <option key={o}>{o}</option>)}
                  </Select>
                ) : f.type === "textarea" ? (
                  <textarea id={`f-${f.id}`} value={values[f.id]} onChange={(e) => set(e.target.value)} rows={3} className={cn(inputClass, "py-2")} />
                ) : (
                  <Input id={`f-${f.id}`} type={f.type === "date" ? "date" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} value={values[f.id]} onChange={(e) => set(e.target.value)} required={f.required} autoComplete={f.id === "name" ? "name" : f.id === "address" ? "street-address" : "off"} />
                )}
              </Field>
            );
          })}
          {form.statements.map((st, i) => (
            <label key={st} className="flex cursor-pointer items-start gap-3 rounded-ui bg-canvas p-3 text-sm">
              <input type="checkbox" checked={!!checked[i]} onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))} className="mt-0.5 size-5 accent-[var(--c-primary)]" />
              <span>{st}</span>
            </label>
          ))}
        </div>

        {form.attachments.length > 0 && (
          <div className="mt-5">
            <p className="flex items-center gap-2 text-sm font-bold"><Paperclip aria-hidden className="size-4" /> Załączniki</p>
            <ul className="mt-1 list-disc pl-6 text-sm text-muted">{form.attachments.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={send} disabled={submit.isPending || submit.isSuccess} size="lg">
            {submit.isPending ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <Send aria-hidden className="size-5" />}
            Wyślij {targetLabel}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => window.print()}>
            <Printer aria-hidden className="size-5" /> Drukuj / PDF
          </Button>
        </div>
        {submit.isError && <p role="alert" className="mt-3 text-sm font-bold text-danger">Nie udało się wysłać: {submit.error.message}. Spróbuj ponownie.</p>}
        {submit.isSuccess && (
          <Callout tone="success" className="mt-4" icon={<CheckCircle2 className="size-5" />} title={`Wysłano — nr ${submit.data.id}`}>
            {submit.data.message} Potwierdzenie: <strong>{submit.data.upo}</strong>.
          </Callout>
        )}
        <p className="mt-3 text-xs text-muted">Wysyłka to symulacja. W wdrożeniu: e-Doręczenia / eZUS / API kadrowo-płacowe pracodawcy.</p>
      </Card>

      {/* Podgląd dokumentu — to on trafia do druku / PDF */}
      <section aria-label="Podgląd wniosku" className="min-w-0">
        <div className="print-area rounded-card border border-line bg-white p-8 text-[0.95rem] leading-relaxed text-black shadow-card">
          <p className="text-right text-sm">………………………, dnia {dateShort(new Date().toISOString().slice(0, 10))}</p>
          <p className="mt-6 font-bold">{values.name || "……………………………"}</p>
          <p className="text-sm">(imię i nazwisko)</p>
          {values.employer !== undefined && <p className="mt-4 text-right font-bold">{values.employer || "………………………"}</p>}
          <h2 className="mt-8 text-center text-lg font-bold uppercase">{form.title}</h2>
          <p className="mt-1 text-center text-xs">na podstawie: {form.legal}</p>
          <dl className="mt-6 grid gap-2">
            {form.fields.filter((f) => !["name", "employer"].includes(f.id)).map((f) => (
              <div key={f.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-dotted border-gray-400 pb-1">
                <dt className="text-sm">{f.label}</dt>
                <dd className="font-bold">{f.type === "date" && values[f.id] ? dateShort(values[f.id]) : values[f.id] || "………"}</dd>
              </div>
            ))}
          </dl>
          {form.statements.length > 0 && (
            <ul className="mt-5 grid gap-1 text-sm">{form.statements.map((st, i) => <li key={st}>{checked[i] ? "☒" : "☐"} {st}</li>)}</ul>
          )}
          {form.attachments.length > 0 && (
            <div className="mt-5 text-sm"><p className="font-bold">Załączniki:</p><ol className="list-decimal pl-5">{form.attachments.map((a) => <li key={a}>{a}</li>)}</ol></div>
          )}
          <p className="mt-12 text-right text-sm">……………………………………<br />(podpis)</p>
        </div>
      </section>
    </div>
  );
}
