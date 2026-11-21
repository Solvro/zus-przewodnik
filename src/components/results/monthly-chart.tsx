import type { MonthlyRow } from "@/engine/types";
import { monthLabel, zl, zl0 } from "@/lib/utils";

/**
 * Słupki miesięcznych kwot brutto (mama + tata, skumulowane).
 * Etykiety osi z jednostką, podsumowanie dla czytników i tabela jako alternatywa (charts: data-table, screen-reader-summary).
 */
export function MonthlyChart({ rows, labels = { mother: "Mama", father: "Tata" } }: { rows: MonthlyRow[]; labels?: { mother: string; father: string } }) {
  if (!rows.length) return <p className="rounded-ui bg-canvas p-4 text-muted">Brak kwot do pokazania.</p>;
  const max = Math.max(...rows.map((r) => r.total));
  const hasFather = rows.some((r) => r.father > 0);
  const W = 640;
  const H = 220;
  const pad = { l: 56, r: 8, t: 12, b: 28 };
  const bw = (W - pad.l - pad.r) / rows.length;
  const y = (v: number) => pad.t + (1 - v / (max || 1)) * (H - pad.t - pad.b);
  const ticks = [0, 0.5, 1].map((f) => Math.round((max * f) / 100) * 100);
  const labelEvery = Math.ceil(rows.length / 8);
  const peak = rows.reduce((a, r) => (r.total > a.total ? r : a), rows[0]);

  return (
    <figure>
      <figcaption className="sr-only">
        Kwoty zasiłków brutto w {rows.length} miesiącach. Najwyższa kwota {zl(peak.total)} w miesiącu {monthLabel(peak.month)}.
      </figcaption>
      <div className="mb-2 flex gap-4 text-sm" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-sm bg-primary" />{labels.mother}</span>
        {hasFather && <span className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-sm bg-navy [background-image:repeating-linear-gradient(45deg,transparent_0_3px,rgb(255_255_255/0.35)_3px_5px)]" />{labels.father}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-hidden>
        <defs>
          <pattern id="father-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--c-navy)" />
            <rect width="2" height="6" fill="rgb(255 255 255 / 0.35)" />
          </pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--c-line)" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--c-muted)">
              {zl0(t)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const x = pad.l + i * bw + bw * 0.15;
          const w = bw * 0.7;
          return (
            <g key={r.month}>
              <rect x={x} y={y(r.mother)} width={w} height={y(0) - y(r.mother)} fill="var(--c-primary)" rx="2">
                <title>{`${monthLabel(r.month)} — ${labels.mother}: ${zl(r.mother)}`}</title>
              </rect>
              {r.father > 0 && (
                <rect x={x} y={y(r.total)} width={w} height={y(r.mother) - y(r.total)} fill="url(#father-stripes)" rx="2">
                  <title>{`${monthLabel(r.month)} — ${labels.father}: ${zl(r.father)}`}</title>
                </rect>
              )}
              {i % labelEvery === 0 && (
                <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--c-muted)">
                  {monthLabel(r.month)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-2">
        <summary className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">Pokaż kwoty w tabeli</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[22rem] text-sm">
            <thead className="border-b-2 border-line text-left text-muted">
              <tr>
                <th scope="col" className="py-1.5 pr-3">Miesiąc</th>
                <th scope="col" className="py-1.5 pr-3 text-right">{labels.mother}</th>
                {hasFather && <th scope="col" className="py-1.5 pr-3 text-right">{labels.father}</th>}
                <th scope="col" className="py-1.5 text-right">Razem brutto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-line">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">{monthLabel(r.month)}</th>
                  <td className="py-1.5 pr-3 text-right tabular">{zl(r.mother)}</td>
                  {hasFather && <td className="py-1.5 pr-3 text-right tabular">{zl(r.father)}</td>}
                  <td className="py-1.5 text-right font-bold tabular">{zl(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
