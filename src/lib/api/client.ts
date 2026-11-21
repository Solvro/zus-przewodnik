/** Cienki klient REST API z obsługą błędów application/problem+json. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public issues: { path: string; message: string }[] = [],
  ) {
    super(title);
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    method: rest.method ?? (json !== undefined ? "POST" : "GET"),
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) {
    let body: { title?: string; errors?: { path: string; message: string }[] } = {};
    try {
      body = await res.json();
    } catch {
      /* brak treści */
    }
    throw new ApiError(res.status, body.title ?? `Błąd ${res.status}`, body.errors ?? []);
  }
  return res.json() as Promise<T>;
}
