import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPersonas, findPersona } from "@/mocks/personas";
import { derived, selectParams } from "@/engine";
import { problem, readJson } from "@/server/http";

/**
 * Symulowane integracje (wymagania S1–S7): mObywatel, systemy ZUS (ubezpieczenie, e-ZLA, zadłużenie),
 * PUE/eZUS, rejestr stanu cywilnego i wysyłka wniosków. Opóźnienie imituje prawdziwe usługi.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const ref = (prefix: string) => `${prefix}/${new Date().getFullYear()}/${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [area, resource, id] = path;
  await delay(350);

  if (area === "personas") {
    return NextResponse.json(
      buildPersonas().map(({ id, firstName, lastName, headline, story, tags }) => ({ id, firstName, lastName, headline, story, tags })),
    );
  }

  if (area === "zus" && id) {
    const persona = findPersona(id);
    if (!persona) return problem(404, "Nie znaleziono ubezpieczonego");
    if (resource === "insured") {
      return NextResponse.json({
        asOf: today(),
        person: { firstName: persona.firstName, lastName: persona.lastName, peselMasked: persona.peselMasked },
        insurance: persona.zus.insurance,
        scenario: persona.scenario,
        source: "Symulacja: Centralny Rejestr Ubezpieczonych / Kompleksowy System Informatyczny ZUS",
      });
    }
    if (resource === "ezla") return NextResponse.json({ asOf: today(), items: persona.zus.ezla });
    if (resource === "debt") {
      const date = new URL(req.url).searchParams.get("date") ?? today();
      const d = derived(selectParams(date));
      const isBusiness = persona.zus.insurance.some((i) => i.title === "Pozarolnicza działalność");
      return NextResponse.json({
        certificateNo: ref("ZAS-DEB"),
        issuedAt: today(),
        asOf: date,
        applies: isBusiness,
        debt: persona.zus.debt,
        threshold: d.debtThreshold,
        blocksBenefit: isBusiness && persona.zus.debt > d.debtThreshold,
        note: isBusiness
          ? "Zaległość powyżej 1% minimalnego wynagrodzenia na dzień powstania prawa do świadczenia wstrzymuje wypłatę do czasu spłaty."
          : "Ubezpieczony nie opłaca składek samodzielnie — stan konta płatnika nie wpływa na prawo do zasiłku.",
      });
    }
  }

  if (area === "pue" && resource === "messages" && id) {
    const persona = findPersona(id);
    if (!persona) return problem(404, "Nie znaleziono profilu");
    return NextResponse.json(persona.zus.messages);
  }

  return problem(404, "Nieznany zasób symulacji");
}

const LoginBody = z.object({ personaId: z.string() });
const QuestionBody = z.object({ personaId: z.string(), topic: z.string().min(2), text: z.string().min(5).max(2000) });
const RscBody = z.object({ kind: z.enum(["skrocony", "zupelny"]), childFirstName: z.string().min(1), birthDate: z.string(), purpose: z.string().min(2) });
const SubmitBody = z.object({ formCode: z.string(), to: z.enum(["employer", "zus", "payer"]), payload: z.record(z.string(), z.unknown()) });

export async function POST(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [area, resource] = path;
  const body = await readJson(req);
  await delay(700);

  if (area === "mobywatel" && resource === "login") {
    const parsed = LoginBody.safeParse(body);
    if (!parsed.success) return problem(400, "Brak identyfikatora osoby");
    const persona = findPersona(parsed.data.personaId);
    if (!persona) return problem(404, "Nie znaleziono osoby");
    return NextResponse.json({
      user: { personaId: persona.id, firstName: persona.firstName, lastName: persona.lastName, peselMasked: persona.peselMasked },
      assurance: "wysoki (symulacja Węzła Krajowego)",
      token: `demo.${persona.id}.${Date.now()}`,
    });
  }

  if (area === "pue" && resource === "question") {
    const parsed = QuestionBody.safeParse(body);
    if (!parsed.success) return problem(400, "Uzupełnij temat i treść pytania");
    return NextResponse.json({
      caseNo: ref("PUE"),
      status: "przyjęte",
      expectedReplyDays: 3,
      message: "Twoje pytanie trafiło do doradcy ZUS. Odpowiedź pojawi się w skrzynce eZUS.",
    });
  }

  if (area === "rsc" && resource === "odpis") {
    const parsed = RscBody.safeParse(body);
    if (!parsed.success) return problem(400, "Uzupełnij dane wniosku o odpis");
    return NextResponse.json({
      caseNo: ref("USC"),
      status: "złożony",
      delivery: "Odpis w postaci elektronicznej trafi na skrzynkę w ciągu 1–2 dni roboczych (symulacja gov.pl).",
    });
  }

  if (area === "submit") {
    const parsed = SubmitBody.safeParse(body);
    if (!parsed.success) return problem(400, "Niepoprawny wniosek");
    const to = parsed.data.to === "zus" ? "ZUS (eZUS)" : parsed.data.to === "employer" ? "pracodawcy" : "zleceniodawcy";
    return NextResponse.json({
      id: ref(parsed.data.formCode),
      status: "doręczony",
      receivedAt: new Date().toISOString(),
      upo: `UPO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      message: `Wniosek ${parsed.data.formCode} został przekazany do ${to}. Zachowaj potwierdzenie (UPO).`,
    });
  }

  return problem(404, "Nieznana operacja symulacji");
}
