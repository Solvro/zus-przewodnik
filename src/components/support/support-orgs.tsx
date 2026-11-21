import { ExternalLink, Phone } from "lucide-react";
import { SUPPORT_ORGS, SUPPORT_TOPICS, type SupportTopic } from "@/content/support";
import { Badge } from "@/components/ui/primitives";

/** Lista organizacji wsparcia; `filter` zawęża do tematu (np. ścieżka po stracie dziecka). */
export function SupportOrgs({ filter, compact = false }: { filter?: SupportTopic; compact?: boolean }) {
  const orgs = filter ? SUPPORT_ORGS.filter((o) => o.topics.includes(filter)) : SUPPORT_ORGS;
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      {compact && <h3 className="font-bold text-navy">Nie musisz przechodzić przez to w samotności</h3>}
      {compact && <p className="mt-1 text-sm text-muted">Organizacje, które pomagają rodzicom w podobnej sytuacji — bezpłatnie.</p>}
      <ul className={`grid gap-3 ${compact ? "mt-4 sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
        {orgs.map((o) => (
          <li key={o.id} className="flex flex-col rounded-ui bg-canvas p-4">
            <p className="font-bold">{o.name}</p>
            <p className="mt-1 flex-1 text-sm text-muted">{o.description}</p>
            {!compact && (
              <p className="mt-2 flex flex-wrap gap-1">
                {o.topics.map((t) => <Badge key={t} tone="neutral">{SUPPORT_TOPICS[t]}</Badge>)}
              </p>
            )}
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold">
              {o.phone && (
                <a href={`tel:${o.phone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center gap-1.5 text-primary underline underline-offset-4">
                  <Phone aria-hidden className="size-4" /> {o.phone}
                </a>
              )}
              {o.url && (
                <a href={o.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-primary underline underline-offset-4">
                  Strona <ExternalLink aria-hidden className="size-4" /><span className="sr-only">(otwiera się w nowej karcie)</span>
                </a>
              )}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Lista przykładowa przygotowana w prototypie — przed wdrożeniem weryfikuje ją ZUS (edytowalna w panelu administracyjnym).</p>
    </div>
  );
}
