"use client";

import { useMemo, useState } from "react";
import { List, Rows3 } from "lucide-react";
import type { Parent, Segment } from "@/engine/types";
import { diffDays, todayIso } from "@/engine/dates";
import { cn, dateShort, pct, zl } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";

const ROWS: { key: Parent; label: string }[] = [
  { key: "mother", label: "Mama" },
  { key: "father", label: "Tata" },
];

/** Kolor + wzór paska wg rodzaju i stawki — nigdy sam kolor (color-not-only). */
export function segmentStyle(seg: Pick<Segment, "kind" | "rate" | "workFraction">) {
  if (seg.kind === "sick_pay" || seg.kind === "sickness")
    return { cls: "bg-rate-sick text-white border-rate-sick", legend: "Zasiłek chorobowy (100%)" };
  if (seg.rate >= 1) return { cls: "bg-rate-100 text-white border-rate-100", legend: "100% podstawy" };
  if (seg.rate > 0.75) return { cls: "bg-rate-815 text-ink border-primary-strong", legend: "81,5% podstawy" };
  return { cls: "bg-rate-70 text-ink border-primary", legend: "70% podstawy" };
}

const STRIPES =
  "bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(255_255_255/0.55)_6px_10px)]";

export function Timeline({
  segments,
  labels = { mother: "Mama", father: "Tata" },
}: {
  segments: Segment[];
  labels?: Record<Parent, string>;
}) {
  const [view, setView] = useState<"bars" | "list">("bars");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const range = useMemo(() => {
    if (!segments.length) return null;
    let start = segments[0].start;
    let end = segments[0].end;
    for (const s of segments) {
      if (s.start < start) start = s.start;
      if (s.end > end) end = s.end;
    }
    return { start, end, days: diffDays(start, end) + 1 };
  }, [segments]);

  const ticks = useMemo(() => {
    if (!range) return [];
    const out: { label: string; left: number }[] = [];
    const [sy, sm] = range.start.split("-").map(Number);
    const months = Math.ceil(range.days / 30) + 1;
    const step = months > 24 ? 6 : months > 12 ? 3 : months > 6 ? 2 : 1;
    for (let i = 1; i <= months; i += 1) {
      const d = new Date(Date.UTC(sy, sm - 1 + i, 1));
      const iso = d.toISOString().slice(0, 10);
      if (iso > range.end) break;
      if ((sm - 1 + i) % step !== 0) continue;
      out.push({
        label: d.toLocaleDateString("pl-PL", { month: "short", year: "2-digit", timeZone: "UTC" }),
        left: (diffDays(range.start, iso) / range.days) * 100,
      });
    }
    return out;
  }, [range]);

  if (!range) {
    return <p className="rounded-ui bg-canvas p-4 text-muted">Brak okresów zasiłku do pokazania — uzupełnij dane po lewej.</p>;
  }

  const today = todayIso();
  const todayLeft = today >= range.start && today <= range.end ? (diffDays(range.start, today) / range.days) * 100 : null;
  const selected = segments.find((s) => s.id === selectedId) ?? null;
  const rows = ROWS.filter((r) => segments.some((s) => s.parent === r.key));
  const legend = [...new Map(segments.map((s) => [segmentStyle(s).legend, segmentStyle(s)])).entries()];
  const hasWork = segments.some((s) => s.workFraction > 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Legenda">
          {legend.map(([label, st]) => (
            <li key={label} className="flex items-center gap-1.5">
              <span aria-hidden className={cn("inline-block size-3.5 rounded-sm border", st.cls)} />
              {label}
            </li>
          ))}
          {hasWork && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden className={cn("inline-block size-3.5 rounded-sm border border-primary bg-rate-100", STRIPES)} />
              praca w trakcie urlopu
            </li>
          )}
        </ul>
        <div className="inline-flex rounded-ui border border-line p-0.5" role="group" aria-label="Widok osi czasu">
          <button
            type="button"
            onClick={() => setView("bars")}
            aria-pressed={view === "bars"}
            className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-[6px] px-3 text-sm font-bold", view === "bars" ? "bg-primary text-white" : "text-ink")}
          >
            <Rows3 aria-hidden className="size-4" /> Oś
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-[6px] px-3 text-sm font-bold", view === "list" ? "bg-primary text-white" : "text-ink")}
          >
            <List aria-hidden className="size-4" /> Lista
          </button>
        </div>
      </div>

      {view === "bars" ? (
        <>
          <div className="relative">
            {rows.map((row) => (
              <div key={row.key} className="mb-3 flex items-center gap-3">
                <span className="w-12 shrink-0 text-sm font-bold text-navy">{labels[row.key]}</span>
                <ul className="relative h-12 flex-1 rounded-ui bg-canvas" aria-label={`Okresy zasiłku — ${labels[row.key]}`}>
                  {segments
                    .filter((s) => s.parent === row.key)
                    .map((s) => {
                      const left = (diffDays(range.start, s.start) / range.days) * 100;
                      const width = Math.max((s.days / range.days) * 100, 0.8);
                      const st = segmentStyle(s);
                      return (
                        <li key={s.id} className="absolute inset-y-1" style={{ left: `${left}%`, width: `${width}%` }}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                            aria-pressed={s.id === selectedId}
                            aria-label={`${s.label}: ${dateShort(s.start)}–${dateShort(s.end)}, ${pct(s.rate)}, ${zl(s.total)}`}
                            className={cn(
                              "flex size-full items-center overflow-hidden rounded-[6px] border px-1.5 text-left text-xs font-bold",
                              st.cls,
                              s.workFraction > 0 && STRIPES,
                              s.id === selectedId && "ring-4 ring-accent",
                            )}
                          >
                            {width > 9 && <span className="truncate">{shortLabel(s)}</span>}
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
            {todayLeft !== null && (
              <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[3.75rem] right-0">
                <div className="absolute inset-y-0 border-l-2 border-dashed border-danger" style={{ left: `${todayLeft}%` }}>
                  <span className="absolute -top-1 left-1 rounded bg-danger px-1 text-[0.65rem] font-bold text-white">dziś</span>
                </div>
              </div>
            )}
          </div>
          <div className="relative ml-[3.75rem] h-5 text-xs text-muted" aria-hidden>
            {ticks.map((t) => (
              <span key={t.left} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${t.left}%` }}>
                {t.label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">Kliknij pasek, aby zobaczyć szczegóły.</p>
          {selected && <SegmentDetails seg={selected} label={labels[selected.parent]} />}
        </>
      ) : (
        <SegmentTable segments={segments} labels={labels} />
      )}
    </div>
  );
}

function shortLabel(s: Segment) {
  const map: Partial<Record<Segment["kind"], string>> = {
    prenatal: "przed porodem",
    maternity: "macierzyński",
    maternity_transfer: "macierzyński",
    adoption_maternity: "na war. macierz.",
    supplementary: "uzupełniający",
    parental: "rodzicielski",
    parental_exclusive: "9 tyg. taty",
    parental_extension: "wydłużenie",
    paternity: "ojcowski",
    loss: "macierzyński",
    sick_pay: "wyn. chorobowe",
    sickness: "chorobowy",
    post_termination: "zasiłek do porodu",
  };
  return `${map[s.kind] ?? s.label} · ${pct(s.rate)}`;
}

function SegmentDetails({ seg, label }: { seg: Segment; label: string }) {
  return (
    <div className="mt-3 rounded-ui border-2 border-accent bg-accent-50 p-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold text-navy">{seg.label}</p>
        <Badge tone="neutral">{label}</Badge>
        <Badge tone="success">{pct(seg.rate)}</Badge>
        {seg.workFraction > 0 && <Badge tone="warning">praca {Math.round(seg.workFraction * 100)}% etatu</Badge>}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div><dt className="text-muted">Okres</dt><dd className="font-bold tabular">{dateShort(seg.start)}–{dateShort(seg.end)}</dd></div>
        <div><dt className="text-muted">Dni</dt><dd className="font-bold tabular">{seg.days}</dd></div>
        <div><dt className="text-muted">Miesięcznie brutto</dt><dd className="font-bold tabular">{zl(seg.monthlyAmount)}</dd></div>
        <div><dt className="text-muted">Razem brutto</dt><dd className="font-bold tabular">{zl(seg.total)}</dd></div>
      </dl>
      <p className="mt-2 text-sm text-muted">
        Wypłaca: <strong className="text-ink">{seg.paidBy === "employer" ? "pracodawca" : seg.paidBy === "payer" ? "płatnik składek (pracodawca/zleceniodawca)" : "ZUS"}</strong>
        {" · "}Podstawa prawna: {seg.legal.map((l) => `${l.act} ${l.ref}`).join("; ")}
      </p>
    </div>
  );
}

export function SegmentTable({ segments, labels }: { segments: Segment[]; labels: Record<Parent, string> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">Okresy zasiłku z kwotami</caption>
        <thead className="border-b-2 border-line text-muted">
          <tr>
            <th scope="col" className="py-2 pr-3">Kto</th>
            <th scope="col" className="py-2 pr-3">Świadczenie</th>
            <th scope="col" className="py-2 pr-3">Okres</th>
            <th scope="col" className="py-2 pr-3 text-right">Stawka</th>
            <th scope="col" className="py-2 pr-3 text-right">Mies. brutto</th>
            <th scope="col" className="py-2 text-right">Razem</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((s) => (
            <tr key={s.id} className="border-b border-line">
              <td className="py-2 pr-3 font-bold">{labels[s.parent]}</td>
              <td className="py-2 pr-3">{s.label}{s.workFraction > 0 ? ` (praca ${Math.round(s.workFraction * 100)}%)` : ""}</td>
              <td className="py-2 pr-3 tabular whitespace-nowrap">{dateShort(s.start)}–{dateShort(s.end)} <span className="text-muted">({s.days} dni)</span></td>
              <td className="py-2 pr-3 text-right tabular">{pct(s.rate)}</td>
              <td className="py-2 pr-3 text-right tabular">{zl(s.monthlyAmount)}</td>
              <td className="py-2 text-right font-bold tabular">{zl(s.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
