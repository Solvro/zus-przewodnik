import { isFeatureOn } from "@/server/feature-store";
import { z } from "zod";
import { calculate, Scenario } from "@/engine";
import { aiConfigured, aiProvider, friendlyAiError } from "@/ai/client";
import { collectCitations, offlineAnswer, streamAnswer, streamAnswerViaOpenAI } from "@/ai/assistant";
import { fromZod, problem, readJson } from "@/server/http";
import { allow } from "@/server/rate-limit";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20)
    .refine((m) => m[0].role === "user" && m.at(-1)!.role === "user", "Rozmowa musi zaczynać się i kończyć pytaniem użytkownika."),
  scenario: Scenario.optional(),
});

/**
 * POST /api/v1/assistant — odpowiedź asystenta jako strumień NDJSON:
 * {"t":"text","v":"…"} … {"t":"done","citations":[…],"ai":true}
 */
export async function POST(req: Request) {
  if (!isFeatureOn("assistant")) return problem(403, "Moduł wyłączony przez administratora.");
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  if (!allow(req, "assistant", 12)) return problem(429, "Za dużo pytań w krótkim czasie — spróbuj za minutę.");

  let plan = null;
  try {
    plan = parsed.data.scenario ? calculate(parsed.data.scenario) : null;
  } catch {
    plan = null;
  }

  const enc = new TextEncoder();
  const line = (o: unknown) => enc.encode(`${JSON.stringify(o)}\n`);
  const headers = { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" };

  if (!aiConfigured()) {
    const ans = offlineAnswer(parsed.data.messages.at(-1)!.content);
    return new Response(new ReadableStream({
      start(c) {
        c.enqueue(line({ t: "text", v: ans.text }));
        c.enqueue(line({ t: "done", citations: ans.citations, ai: false }));
        c.close();
      },
    }), { headers });
  }

  const body = new ReadableStream({
    async start(controller) {
      try {
        if (aiProvider() === "openai") {
          const r = await streamAnswerViaOpenAI(parsed.data.messages, plan, (v) => controller.enqueue(line({ t: "text", v })));
          if (r.refused) controller.enqueue(line({ t: "text", v: "\n\nNie mogę odpowiedzieć na to pytanie. Zapytaj proszę doradcę ZUS przez eZUS." }));
          controller.enqueue(line({ t: "done", citations: r.citations, ai: true }));
          return;
        }
        const stream = streamAnswer(parsed.data.messages, plan);
        stream.on("text", (delta) => controller.enqueue(line({ t: "text", v: delta })));
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(line({ t: "text", v: "\n\nNie mogę odpowiedzieć na to pytanie. Zapytaj proszę doradcę ZUS przez eZUS." }));
        }
        controller.enqueue(line({ t: "done", citations: collectCitations(final), ai: true }));
      } catch (e) {
        controller.enqueue(line({ t: "error", v: friendlyAiError(e).title }));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers });
}
