import type { Metadata } from "next";
import { buildOpenApi } from "@/server/openapi";

export const metadata: Metadata = { title: "API — dokumentacja (OpenAPI)" };

/** Czytelna dokumentacja REST API generowana z tej samej specyfikacji co /api/v1/openapi. */
export default function ApiDocsPage() {
  const spec = buildOpenApi();
  const methods = Object.entries(spec.paths).flatMap(([path, ops]) => Object.entries(ops).map(([method, op]) => ({ path, method, op: op as { summary: string; tags?: string[] } })));
  const example = spec.paths["/api/v1/calculate"].post.requestBody.content["application/json"].examples.pracownica.value;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black text-navy">{spec.info.title}</h1>
      <p className="prose-zus mt-2 text-muted">{spec.info.description}</p>
      <p className="mt-3"><a className="font-bold text-primary underline underline-offset-4" href="/api/v1/openapi">Pobierz specyfikację OpenAPI 3.1 (JSON)</a></p>
      <h2 className="mt-8 text-xl font-bold text-navy">Endpointy</h2>
      <ul className="mt-3 grid gap-2">
        {methods.map((m) => (
          <li key={m.method + m.path} className="flex flex-wrap items-center gap-3 rounded-ui border border-line bg-surface p-3">
            <span className="rounded bg-navy px-2 py-0.5 text-xs font-bold uppercase text-white">{m.method}</span>
            <code className="font-bold">{m.path}</code>
            <span className="text-muted">{m.op.summary}</span>
          </li>
        ))}
        <li className="rounded-ui border border-dashed border-line p-3 text-sm text-muted">
          Dodatkowo: <code>/api/v1/cases</code>, <code>/api/v1/documents/extract</code> (AI), <code>/api/v1/assistant</code> (AI, NDJSON), <code>/api/v1/plain-language</code> (AI), <code>/api/v1/mock/*</code> (symulacje integracji), <code>/api/v1/admin/*</code> (panel, token).
        </li>
      </ul>
      <h2 className="mt-8 text-xl font-bold text-navy">Przykład</h2>
      <pre className="mt-3 overflow-x-auto rounded-ui bg-navy p-4 text-sm text-white"><code>{`curl -X POST /api/v1/calculate \\\n  -H 'content-type: application/json' \\\n  -d '${JSON.stringify(example)}'`}</code></pre>
    </div>
  );
}
