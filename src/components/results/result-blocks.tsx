import { AlertTriangle, CalendarClock, CheckCircle2, CircleSlash, FileText, Info, ShieldAlert, ThumbsUp } from "lucide-react";
import type { CalculationResult, Eligibility, Risk } from "@/engine/types";
import { cn, dateShort, zl } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";

/* ───────── Uprawnienia ───────── */
const STATUS: Record<Eligibility["status"], { label: string; tone: "success" | "danger" | "warning" | "info"; Icon: typeof CheckCircle2 }> = {
  eligible: { label: "Przysługuje", tone: "success", Icon: CheckCircle2 },
  not_eligible: { label: "Nie przysługuje", tone: "danger", Icon: CircleSlash },
  at_risk: { label: "Zagrożone", tone: "warning", Icon: AlertTriangle },
  info: { label: "Informacja", tone: "info", Icon: Info },
};

export function EligibilityList({ items }: { items: Eligibility[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((e, i) => {
        const st = STATUS[e.status];
        return (
          <li key={`${e.parent}-${e.benefit}-${i}`} className="rounded-ui border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="flex items-start gap-2 font-bold text-navy">
                <st.Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", st.tone === "success" && "text-primary", st.tone === "danger" && "text-danger", st.tone === "warning" && "text-warning", st.tone === "info" && "text-info")} />
                {e.title}
              </p>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            {e.reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
                {e.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">{e.legal.map((l) => `${l.act}, ${l.ref}`).join(" · ")}</p>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────── Ryzyka ───────── */
const RISK: Record<Risk["level"], { label: string; cls: string; Icon: typeof ShieldAlert }> = {
  high: { label: "Ważne", cls: "border-l-danger bg-danger-50", Icon: ShieldAlert },
  medium: { label: "Uwaga", cls: "border-l-warning bg-warning-50", Icon: AlertTriangle },
  info: { label: "Dobrze wiedzieć", cls: "border-l-info bg-info-50", Icon: Info },
  positive: { label: "Na Twoją korzyść", cls: "border-l-primary bg-primary-50", Icon: ThumbsUp },
};

export function RiskList({ risks }: { risks: Risk[] }) {
  if (!risks.length) return <p className="text-muted">Nie widzimy zagrożeń dla tego scenariusza.</p>;
  return (
    <ul className="grid gap-3">
      {risks.map((r) => {
        const st = RISK[r.level];
        return (
          <li key={r.id} className={cn("rounded-ui border-l-4 p-4", st.cls)}>
            <div className="flex gap-3">
              <st.Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{st.label}</p>
                <p className="font-bold leading-snug">{r.title}</p>
                <p className="mt-1 text-sm">{r.description}</p>
                {r.action && (
                  <p className="mt-2 text-sm">
                    <strong>Co zrobić: </strong>
                    {r.action}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">{r.legal.map((l) => `${l.act}, ${l.ref}`).join(" · ")}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────── Dokumenty ───────── */
const SUBMIT_TO: Record<string, string> = {
  employer: "Pracodawca",
  zus: "ZUS",
  payer: "Zleceniodawca",
  none: "Bez Twojego udziału",
};

export function DocumentList({ docs, labels }: { docs: CalculationResult["documents"]; labels: { mother: string; father: string } }) {
  if (!docs.length) return <p className="text-muted">Brak dokumentów do złożenia w tym scenariuszu.</p>;
  return (
    <ul className="grid gap-3">
      {docs.map((d) => (
        <li key={d.id} className="flex gap-3 rounded-ui border border-line bg-surface p-4">
          <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">{d.name}</p>
              {d.code && <Badge tone="info">{d.code}</Badge>}
              {!d.required && <Badge tone="neutral">opcjonalnie</Badge>}
            </div>
            <dl className="mt-1 grid gap-x-4 text-sm sm:grid-cols-3">
              <div><dt className="inline text-muted">Kto: </dt><dd className="inline">{labels[d.parent]}</dd></div>
              <div><dt className="inline text-muted">Gdzie: </dt><dd className="inline">{SUBMIT_TO[d.submitTo]} — {d.channel}</dd></div>
              <div><dt className="inline text-muted">Kiedy: </dt><dd className="inline">{d.when}</dd></div>
            </dl>
            {d.note && <p className="mt-1 text-sm text-muted">{d.note}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ───────── Terminy ───────── */
export function DeadlineList({ deadlines, labels }: { deadlines: CalculationResult["deadlines"]; labels: { mother: string; father: string } }) {
  if (!deadlines.length) return <p className="text-muted">Brak terminów.</p>;
  return (
    <ol className="relative grid gap-3 border-l-2 border-line pl-5">
      {deadlines.map((d) => (
        <li key={d.id} className={cn("relative", d.passed && "opacity-60")}>
          <span
            aria-hidden
            className={cn(
              "absolute -left-[1.72rem] top-1 size-3.5 rounded-full border-2 border-surface",
              d.kind === "expires" ? "bg-danger" : d.kind === "must" ? "bg-primary" : "bg-info",
            )}
          />
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <CalendarClock aria-hidden className="size-4 text-muted" />
            <time dateTime={d.date} className="font-bold tabular">{dateShort(d.date)}</time>
            <Badge tone="neutral">{labels[d.parent]}</Badge>
            {d.passed && <Badge tone="neutral">minął</Badge>}
            {d.kind === "expires" && !d.passed && <Badge tone="danger">prawo wygasa</Badge>}
          </p>
          <p className="font-bold">{d.title}</p>
          <p className="text-sm text-muted">{d.description}</p>
        </li>
      ))}
    </ol>
  );
}

/* ───────── Ślad obliczeń ───────── */
const SOURCE_LABEL = { parametr: "parametr", dane: "Twoje dane", reguła: "reguła", założenie: "założenie" } as const;

export function TraceList({ trace }: { trace: CalculationResult["trace"] }) {
  return (
    <ol className="grid gap-2 text-sm">
      {trace.map((t) => (
        <li key={t.id} className="rounded-ui bg-canvas p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-bold">{t.label}</p>
            <p className="font-bold tabular text-navy">{t.value}</p>
          </div>
          {t.formula && <p className="mt-0.5 text-muted">{t.formula}</p>}
          <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
            <Badge tone={t.source === "założenie" ? "warning" : "neutral"}>{SOURCE_LABEL[t.source]}</Badge>
            {t.legal?.map((l) => `${l.act}, ${l.ref}`).join(" · ")}
          </p>
        </li>
      ))}
    </ol>
  );
}

/* ───────── Podsumowanie ───────── */
export function SummaryStats({ result, labels }: { result: CalculationResult; labels: { mother: string; father: string } }) {
  const m = result.segments.find((s) => s.parent === "mother" && ["maternity", "adoption_maternity", "loss"].includes(s.kind));
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Razem brutto" value={zl(result.totals.all)} hint={`ok. ${zl(result.totals.netEstimate)} netto (szacunek)`} strong />
      <Stat label={`${labels.mother} — miesięcznie`} value={m ? zl(m.monthlyAmount) : "—"} hint={m ? "w pierwszym okresie" : "brak zasiłku"} />
      <Stat
        label={`${labels.mother} wraca do pracy`}
        value={result.returnToWork.mother ? dateShort(result.returnToWork.mother) : "—"}
        hint="dzień po ostatnim zasiłku"
      />
      <Stat
        label={`${labels.father} — razem`}
        value={result.totals.father ? zl(result.totals.father) : "—"}
        hint={result.returnToWork.father ? `powrót ${dateShort(result.returnToWork.father)}` : "brak okresów"}
      />
    </dl>
  );
}

function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-ui border p-3", strong ? "border-primary bg-primary-50" : "border-line bg-surface")}>
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className={cn("font-display mt-0.5 tabular text-navy", strong ? "text-2xl" : "text-xl")}>{value}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}
