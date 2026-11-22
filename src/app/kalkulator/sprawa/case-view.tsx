"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, FileSearch, FileUp, Loader2, Play, TriangleAlert, Upload, X, XCircle } from "lucide-react";
import { compareWithDecision } from "@/engine/compare";
import type { CaseRunResult } from "@/lib/api/queries";
import { useCasesQuery, useExtractMutation, useRunCaseMutation } from "@/lib/api/queries";
import { scenarioActions } from "@/lib/scenario-store";
import { cn, dateShort, zl } from "@/lib/utils";
import { AiBadge, Badge, Button, ButtonLink, Callout, Card, CardHeader } from "@/components/ui/primitives";
import { EligibilityList, SummaryStats } from "@/components/results/result-blocks";
import { Timeline } from "@/components/results/timeline";
import { parentLabels } from "@/components/results/results-panel";

const DOC_LABEL: Record<string, string> = {
  poswiadczenie_ubezpieczenia: "Poświadczenie ubezpieczenia",
  zrzut_systemu_zus: "Zrzut z systemu ZUS",
  zaswiadczenie_lekarskie: "Zaświadczenie lekarskie",
  akt_urodzenia: "Akt urodzenia",
  zaswiadczenie_szpitala: "Zaświadczenie ze szpitala",
  inne: "Inny dokument",
};

/** Tryb „Sprawa ZUS” (R6, T3): przykład z listy lub upload → odczyt → wynik silnika → porównanie z decyzją. */
export function CaseView() {
  const cases = useCasesQuery();
  const run = useRunCaseMutation();
  const extract = useExtractMutation();
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const data: CaseRunResult | undefined = active === "upload" ? extract.data : run.data;
  const pending = run.isPending || extract.isPending;
  const error = active === "upload" ? extract.error : run.error;
  const aiAvailable = cases.data?.aiAvailable ?? false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ButtonLink href="/kalkulator" variant="link" className="text-sm"><ArrowLeft aria-hidden className="size-4" /> Kalkulator</ButtonLink>
      <h1 className="mt-2 text-3xl font-black text-navy">Sprawa ZUS — sprawdź na dokumentach</h1>
      <p className="prose-zus mt-1 text-muted">
        Wgraj dokumenty sprawy (ZAM, Z-3, Z-3a, poświadczenie ubezpieczenia, zrzut z systemu) albo wybierz przykład. Odczytamy dane, sprawdzimy ubezpieczenie i policzymy zasiłek — a jeśli sprawa zawiera decyzję, porównamy wynik.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader icon={<FileUp className="size-6" />} title={<span className="flex items-center gap-2">Wgraj dokumenty <AiBadge /></span>} description="PDF, PNG lub JPG — do 8 plików po 15 MB." />
            <div className="grid gap-3 px-5 pb-5">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setFiles((f) => [...f, ...Array.from(e.dataTransfer.files)].slice(0, 8));
                }}
                className="flex flex-col items-center gap-2 rounded-ui border-2 border-dashed border-muted/50 bg-canvas p-6 text-center"
              >
                <Upload aria-hidden className="size-8 text-muted" />
                <p className="text-sm text-muted">Przeciągnij pliki tutaj albo</p>
                <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>Wybierz pliki</Button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-label="Wybierz pliki dokumentów sprawy"
                  onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])].slice(0, 8))}
                />
              </div>
              {files.length > 0 && (
                <ul className="grid gap-1 text-sm">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-ui bg-canvas px-3 py-1.5">
                      <span className="truncate">{f.name} <span className="text-muted">({Math.round(f.size / 1024)} KB)</span></span>
                      <button type="button" aria-label={`Usuń ${f.name}`} className="inline-flex size-9 items-center justify-center rounded-ui hover:bg-line" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>
                        <X aria-hidden className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 accent-[var(--c-primary)]" />
                <span>Zgadzam się na odczyt dokumentów przez model AI. Pliki są przetwarzane tylko w pamięci i nie są zapisywane.</span>
              </label>
              {!aiAvailable && cases.isSuccess && (
                <Callout tone="warning" title="AI nie jest skonfigurowane na tym serwerze">Wybierz przykład z listy obok albo wpisz dane w kalkulatorze.</Callout>
              )}
              <Button
                type="button"
                disabled={!files.length || !consent || pending || !aiAvailable}
                onClick={() => {
                  setActive("upload");
                  extract.mutate(files);
                }}
              >
                {extract.isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <FileSearch aria-hidden className="size-4" />}
                {extract.isPending ? "Odczytuję dokumenty… (do minuty)" : "Odczytaj i policz"}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Przykładowe sprawy" description="Fikcyjne sprawy do testów; prawdziwe zestawy ZUS pojawią się tu po wgraniu na serwer." />
            <ul className="grid gap-2 px-5 pb-5">
              {cases.isPending && Array.from({ length: 4 }, (_, i) => <li key={i} className="h-16 animate-pulse rounded-ui bg-line/60" />)}
              {cases.data?.cases.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={pending || (c.needsAi && !aiAvailable)}
                    onClick={() => {
                      setActive(c.id);
                      run.mutate(c.id);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-ui border-2 p-3 text-left transition-colors disabled:opacity-50",
                      active === c.id ? "border-primary bg-primary-50" : "border-line hover:border-muted",
                    )}
                  >
                    {run.isPending && active === c.id ? <Loader2 aria-hidden className="mt-0.5 size-5 shrink-0 animate-spin text-primary" /> : <Play aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />}
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 font-bold">
                        {c.id} · {c.title}
                        {c.source === "zus" && <Badge tone="info">zestaw ZUS</Badge>}
                      </span>
                      <span className="block text-sm text-muted">{c.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <section aria-live="polite" aria-busy={pending} className="min-w-0">
          {pending && (
            <Card className="p-8 text-center">
              <Loader2 aria-hidden className="mx-auto size-10 animate-spin text-primary" />
              <p className="mt-3 font-bold text-navy">{active === "upload" ? "Model odczytuje dokumenty…" : "Liczę sprawę…"}</p>
            </Card>
          )}
          {!pending && error && (
            <Callout tone="danger" icon={<TriangleAlert className="size-5" />} title="Nie udało się przetworzyć sprawy">{error.message}</Callout>
          )}
          {!pending && !error && !data && (
            <Card className="p-8 text-center text-muted">
              <FileSearch aria-hidden className="mx-auto size-10" />
              <p className="mt-3">Wybierz przykład lub wgraj dokumenty — wynik pojawi się tutaj.</p>
            </Card>
          )}
          {!pending && data && <CaseResult data={data} />}
        </section>
      </div>
    </div>
  );
}

function CaseResult({ data }: { data: CaseRunResult }) {
  const router = useRouter();
  const ex = data.extracted;
  const who = ex.insured.role === "father" ? "father" : "mother";
  const labels = parentLabels(data.scenario);
  const cmp = data.result ? compareWithDecision(data.result, data.expected ?? null, who) : null;
  const facts: [string, string, string?][] = [
    ["Tytuł ubezpieczenia", { employment: "umowa o pracę", mandate: "umowa zlecenia", business: "działalność gospodarcza", none: "brak", unknown: "nie rozpoznano" }[ex.insuranceTitle], "insuranceTitle"],
    ["Ubezpieczenie chorobowe", { mandatory: "obowiązkowe", voluntary: "dobrowolne", none: "brak", unknown: "nie wiadomo" }[ex.sicknessInsurance], "sicknessInsurance"],
    ["Okres ubezpieczenia", `${ex.insuranceFrom ? dateShort(ex.insuranceFrom) : "?"} – ${ex.insuranceTo ? dateShort(ex.insuranceTo) : "obecnie"}`, "insuranceFrom"],
    ["Płatnik zgłasza", ex.payerInsuredCount === null ? "brak danych" : `${ex.payerInsuredCount} osób`, "payerInsuredCount"],
    ["Data porodu / przyjęcia", ex.childBirthDate ?? ex.placementDate ? dateShort((ex.childBirthDate ?? ex.placementDate)!) : "brak", "childBirthDate"],
    ["Dane do podstawy", ex.benefitBasis ? `podstawa ${zl(ex.benefitBasis)}` : ex.monthlyIncomes.length ? `${ex.monthlyIncomes.length} mies. wynagrodzeń` : ex.declaredBases.length ? `${ex.declaredBases.length} mies. podstaw składek` : "brak", "monthlyIncomes"],
    ["Wniosek 81,5%", ex.averaged815 ? "tak" : "nie", "averaged815"],
    ["Zaległość w składkach", ex.contributionDebt === null ? "—" : zl(ex.contributionDebt), "contributionDebt"],
  ];

  return (
    <div className="grid gap-6">
      {cmp && cmp.rightMatches !== null && (
        <Card className={cn("border-2 p-5", cmp.rightMatches && cmp.amountMatches !== false ? "border-primary" : "border-danger")}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
            {cmp.rightMatches && cmp.amountMatches !== false ? <CheckCircle2 aria-hidden className="size-6 text-primary" /> : <XCircle aria-hidden className="size-6 text-danger" />}
            Porównanie z decyzją w sprawie
          </h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-ui bg-canvas p-3">
              <dt className="text-sm text-muted">Prawo do zasiłku</dt>
              <dd className="font-bold">
                Decyzja: {data.expected?.outcome === "granted" ? "przyznano" : "odmowa"} · Silnik: {cmp.computedOutcome === "granted" ? "przysługuje" : "nie przysługuje / wstrzymane"}{" "}
                {cmp.rightMatches ? <Badge tone="success"><Check aria-hidden className="size-3" /> zgodne</Badge> : <Badge tone="danger">niezgodne</Badge>}
              </dd>
            </div>
            <div className="rounded-ui bg-canvas p-3">
              <dt className="text-sm text-muted">Kwota miesięczna</dt>
              <dd className="font-bold tabular">
                Decyzja: {data.expected?.monthlyAmount != null ? zl(data.expected.monthlyAmount) : "—"} · Silnik: {cmp.computedAmount != null ? zl(cmp.computedAmount) : "—"}{" "}
                {cmp.amountMatches === true && <Badge tone="success">zgodne (±1 zł)</Badge>}
                {cmp.amountMatches === false && <Badge tone="danger">różnica {zl(cmp.diff ?? 0)}</Badge>}
              </dd>
            </div>
          </dl>
          {data.expected?.reason && <p className="mt-3 text-sm"><strong>Uzasadnienie w sprawie:</strong> {data.expected.reason}</p>}
        </Card>
      )}

      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2">Odczytane dane {data.ai && <AiBadge />}</span>}
          description={data.ai ? "Odczyt przez AI — sprawdź dane, zanim na nich polegasz. Kwoty liczy silnik reguł." : "Dane przykładowej sprawy."}
        />
        <div className="px-5 pb-5">
          <ul className="mb-4 flex flex-wrap gap-2">
            {ex.documents.map((d, i) => (
              <li key={i}><Badge tone="info" title={d.summary}>{DOC_LABEL[d.kind] ?? d.kind}</Badge></li>
            ))}
          </ul>
          <table className="w-full text-sm">
            <caption className="sr-only">Dane odczytane z dokumentów</caption>
            <tbody>
              {facts.map(([k, v, f]) => {
                const uncertain = f && ex.uncertainFields.some((u) => u.toLowerCase().includes(f.toLowerCase()));
                return (
                  <tr key={k} className="border-b border-line">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-muted">{k}</th>
                    <td className="py-2 font-bold">{v} {uncertain && <Badge tone="warning">niepewne</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(data.assumptions.length > 0 || ex.notes.length > 0) && (
            <Callout tone="warning" className="mt-4" title="Założenia i uwagi">
              <ul className="list-disc pl-5">{[...data.assumptions, ...ex.notes].map((a) => <li key={a}>{a}</li>)}</ul>
            </Callout>
          )}
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => {
              scenarioActions.replace(data.scenario, "documents");
              router.push("/kalkulator");
            }}
          >
            Popraw dane i przelicz w kalkulatorze
          </Button>
        </div>
      </Card>

      {data.result && (
        <>
          <SummaryStats result={data.result} labels={labels} />
          <Card>
            <CardHeader title="Uprawnienia" />
            <div className="px-5 pb-5"><EligibilityList items={data.result.eligibility} /></div>
          </Card>
          {data.result.segments.length > 0 && (
            <Card>
              <CardHeader title="Oś czasu" />
              <div className="px-5 pb-5"><Timeline segments={data.result.segments} labels={labels} /></div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
