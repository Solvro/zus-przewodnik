import { z } from "zod";
import { Scenario } from "@/engine";

/** Specyfikacja OpenAPI 3.1 generowana ze schematów Zod — jedno źródło prawdy dla walidacji i dokumentacji. */
export function buildOpenApi() {
  const scenarioSchema = z.toJSONSchema(Scenario, { io: "input", unrepresentable: "any" });
  const problem = {
    type: "object",
    properties: {
      status: { type: "integer" },
      title: { type: "string" },
      detail: { type: "string" },
      errors: { type: "array", items: { type: "object", properties: { path: { type: "string" }, message: { type: "string" } } } },
    },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Rodzicownik — API świadczeń z ubezpieczenia chorobowego",
      version: "0.1.0",
      description:
        "Ustalanie uprawnień do zasiłku chorobowego w ciąży i zasiłku macierzyńskiego (urlop macierzyński, rodzicielski, ojcowski, uzupełniający, przysposobienie). Wynik zawiera oś czasu, kwoty, ryzyka, dokumenty, terminy i ślad obliczeń z podstawą prawną. Prototyp HackNation 2026 — wynik ma charakter symulacji.",
    },
    servers: [{ url: "/" }],
    tags: [
      { name: "Obliczenia", description: "Silnik reguł" },
      { name: "Parametry", description: "Wersjonowane parametry prawne" },
      { name: "System" },
    ],
    paths: {
      "/api/v1/calculate": {
        post: {
          tags: ["Obliczenia"],
          summary: "Policz uprawnienia i kwoty dla scenariusza",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Scenario" },
                examples: {
                  pracownica: {
                    summary: "Pracownica, 1 dziecko, wariant 81,5%",
                    value: {
                      event: "birth",
                      birthDate: "2026-12-01",
                      childrenCount: 1,
                      mother: {
                        title: "employment",
                        insuranceStart: "2022-01-01",
                        payerInsuredCount: 50,
                        basis: { mode: "gross", monthlyGross: 8000 },
                      },
                      father: {
                        title: "employment",
                        insuranceStart: "2020-03-01",
                        payerInsuredCount: 12,
                        basis: { mode: "gross", monthlyGross: 9000 },
                      },
                      plan: { averaged: true, parentalFatherWeeks: 9, paternity: true },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Wynik obliczeń", content: { "application/json": { schema: { $ref: "#/components/schemas/CalculationResult" } } } },
            "400": { description: "Błąd walidacji", content: { "application/problem+json": { schema: problem } } },
            "422": { description: "Scenariusz niemożliwy do policzenia", content: { "application/problem+json": { schema: problem } } },
          },
        },
      },
      "/api/v1/parameters": {
        get: {
          tags: ["Parametry"],
          summary: "Parametry prawne obowiązujące w danym dniu",
          parameters: [{ name: "date", in: "query", required: false, schema: { type: "string", format: "date" } }],
          responses: { "200": { description: "Zestaw parametrów i wartości pochodne" } },
        },
      },
      "/api/v1/health": {
        get: { tags: ["System"], summary: "Stan usługi", responses: { "200": { description: "OK" } } },
      },
    },
    components: {
      schemas: {
        Scenario: scenarioSchema,
        CalculationResult: {
          type: "object",
          description: "Pełny wynik silnika (patrz src/engine/types.ts).",
          properties: {
            paramsId: { type: "string" },
            eventDate: { type: ["string", "null"], format: "date" },
            eligibility: { type: "array", items: { type: "object" }, description: "Uprawnienia: eligible / not_eligible / at_risk / info, z uzasadnieniem i przepisem" },
            segments: { type: "array", items: { type: "object" }, description: "Okresy zasiłku na osi czasu z kwotami" },
            monthly: { type: "array", items: { type: "object" }, description: "Kwoty brutto w podziale na miesiące i rodziców" },
            totals: { type: "object" },
            risks: { type: "array", items: { type: "object" } },
            documents: { type: "array", items: { type: "object" } },
            deadlines: { type: "array", items: { type: "object" } },
            trace: { type: "array", items: { type: "object" }, description: "Ślad obliczeń: reguła, wartość, wzór, przepis" },
            validation: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  };
}
