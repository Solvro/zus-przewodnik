import { describe, expect, it } from "vitest";
import { calculate, PARAMS_2026, type Scenario } from "@/engine";
import { computeBasis } from "@/engine/basis";
import { addDays, spanDays } from "@/engine/dates";
import { coverageOn, whoPays } from "@/engine/insurance";
import { maternityWeeks, parentalPool, supplementaryWeeks } from "@/engine/leave";

const p = PARAMS_2026;
const TODAY = "2026-11-21";

const employee = (gross = 8000, extra: Partial<Scenario["mother"]> = {}): Scenario["mother"] => ({
  title: "employment",
  insuranceStart: "2022-01-01",
  payerInsuredCount: 50,
  basis: { mode: "gross", monthlyGross: gross },
  ...extra,
});

const birth = (extra: Partial<Scenario> = {}): Scenario => ({
  event: "birth",
  today: TODAY,
  birthDate: "2026-12-01",
  childrenCount: 1,
  mother: employee(),
  ...extra,
});

const seg = (r: ReturnType<typeof calculate>, parent: string, kind: string) =>
  r.segments.filter((x) => x.parent === parent && x.kind === kind);

describe("tabele wymiarów (Załącznik)", () => {
  it.each([
    [1, 20],
    [2, 31],
    [3, 33],
    [4, 35],
    [5, 37],
    [7, 37],
  ])("macierzyński: %i dzieci → %i tygodni", (n, w) => {
    expect(maternityWeeks(n, p)).toBe(w);
  });

  it.each([
    [1, false, 41],
    [2, false, 43],
    [1, true, 65],
    [3, true, 67],
  ])("rodzicielski: %i dzieci, Za życiem=%s → %i tygodni", (n, zz, w) => {
    expect(parentalPool(n, zz, p)).toBe(w);
  });
});

describe("podstawa wymiaru", () => {
  it("brutto − 13,71%", () => {
    expect(computeBasis({ mode: "gross", monthlyGross: 8000 }, { title: "employment", fullTime: true }, p).monthlyBasis).toBe(6903.2);
  });

  it("minimum dla pełnego etatu = 4 147,10 zł", () => {
    const b = computeBasis({ mode: "gross", monthlyGross: 3000 }, { title: "employment", fullTime: true }, p);
    expect(b.monthlyBasis).toBe(4147.1);
    expect(b.minimumApplied).toBe(true);
  });

  it("niepełny etat — bez minimum", () => {
    const b = computeBasis({ mode: "gross", monthlyGross: 2000 }, { title: "employment", fullTime: false }, p);
    expect(b.monthlyBasis).toBe(1725.8);
  });

  it("pomija miesiące z < ½ czasu pracy i dolicza 1/12 premii", () => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: `2025-${String(i + 1).padStart(2, "0")}`,
      gross: i === 5 ? 1000 : 9000,
      workedAtLeastHalf: i !== 5,
    }));
    const b = computeBasis(
      { mode: "months", months, quarterlyBonusesLast4: [1200, 1200, 1200, 1200], annualBonusLastYear: 6000 },
      { title: "employment", fullTime: true },
      p,
    );
    // (9000 + 4800/12 + 6000/12) × 0,8629 = 9900 × 0,8629
    expect(b.monthlyBasis).toBe(8542.71);
  });

  it("JDG: limit 20 321,30 zł", () => {
    const b = computeBasis(
      { mode: "declared", monthlyBases: Array(12).fill(30000), minBaseType: "standard" },
      { title: "business", fullTime: true },
      p,
    );
    expect(b.monthlyBasis).toBe(20321.3);
    expect(b.capApplied).toBe(true);
  });

  it("JDG < 12 mies. — art. 48a", () => {
    const b = computeBasis(
      { mode: "declared", monthlyBases: Array(6).fill(10000), minBaseType: "standard" },
      { title: "business", fullTime: true },
      p,
    );
    // 5652 × 0,8629 = 4877,11; nadwyżka (8629 − 4877,11) / 12 × 6 = 1875,95
    expect(b.monthlyBasis).toBeCloseTo(6753.06, 1);
  });
});

describe("ubezpieczenie i płatnik", () => {
  it("płatnik: 20 → ZUS, 21 → płatnik, JDG → ZUS", () => {
    expect(whoPays({ ...employee(), payerInsuredCount: 20 } as never, p).who).toBe("zus");
    expect(whoPays({ ...employee(), payerInsuredCount: 21 } as never, p).who).toBe("payer");
    expect(whoPays({ title: "business" } as never, p).who).toBe("zus");
  });

  it("zlecenie bez dobrowolnego chorobowego → brak prawa", () => {
    const r = calculate(birth({ mother: { title: "mandate", voluntarySickness: false, basis: { mode: "gross", monthlyGross: 5000 } } }));
    expect(r.eligibility[0].status).toBe("not_eligible");
    expect(r.segments.length).toBe(0);
    expect(r.risks.some((x) => x.id === "mother.notCovered")).toBe(true);
  });

  it("JDG: zaległość 48,06 zł OK, 48,07 zł blokuje", () => {
    const base = { title: "business" as const, voluntarySickness: true, insuranceStart: "2024-01-01" };
    const ok = coverageOn({ ...base, contributionDebt: 48.06 } as never, "2026-12-01", { isMother: true, isBirth: true }, p);
    const bad = coverageOn({ ...base, contributionDebt: 48.07 } as never, "2026-12-01", { isMother: true, isBirth: true }, p);
    expect(ok.blockedByDebt).toBe(false);
    expect(bad.blockedByDebt).toBe(true);
  });

  it("umowa terminowa kończąca się po 3. miesiącu ciąży → przedłużenie do porodu", () => {
    const r = calculate(
      birth({
        dueDate: "2027-03-01",
        birthDate: "2027-03-01",
        mother: employee(8000, { contractType: "fixed", insuranceEnd: "2026-12-31" }),
      }),
    );
    expect(r.eligibility[0].status).toBe("eligible");
    expect(r.risks.some((x) => x.id === "mother.extended")).toBe(true);
  });

  it("umowa terminowa kończąca się przed końcem 3. miesiąca ciąży → brak prawa", () => {
    const r = calculate(
      birth({
        dueDate: "2027-03-01",
        birthDate: "2027-03-01",
        mother: employee(8000, { contractType: "fixed", insuranceEnd: "2026-07-01" }),
      }),
    );
    expect(r.eligibility[0].status).toBe("not_eligible");
  });

  it("upadłość pracodawcy w ciąży → zasiłek w wysokości macierzyńskiego do porodu", () => {
    const r = calculate(
      birth({
        dueDate: "2027-03-01",
        birthDate: "2027-03-01",
        mother: employee(8000, { insuranceEnd: "2026-11-01", endReason: "bankruptcy" }),
      }),
    );
    const post = seg(r, "mother", "post_termination");
    expect(post).toHaveLength(1);
    expect(post[0].start).toBe("2026-11-02");
    expect(post[0].end).toBe("2027-02-28");
    expect(post[0].paidBy).toBe("zus");
    expect(seg(r, "mother", "maternity")[0].days).toBe(140);
  });
});

describe("zasiłek macierzyński — urodzenie", () => {
  it("wariant 100% + 70%, matka sama", () => {
    const r = calculate(birth());
    const mat = seg(r, "mother", "maternity")[0];
    expect(mat.days).toBe(140);
    expect(mat.monthlyAmount).toBe(6903.2);
    expect(mat.dailyAmount).toBe(230.11);
    expect(mat.total).toBe(32215.4);
    const par = seg(r, "mother", "parental")[0];
    expect(par.days).toBe(32 * 7);
    expect(par.rate).toBe(0.7);
    expect(par.monthlyAmount).toBe(4832.24);
    expect(r.weeks.parentalUnused).toBe(9);
    expect(r.payer.mother?.who).toBe("payer");
    expect(r.risks.some((x) => x.id === "averaged.option")).toBe(true);
  });

  it("wariant 81,5% dla całego okresu matki", () => {
    const r = calculate(birth({ plan: { averaged: true } }));
    expect(seg(r, "mother", "maternity")[0].rate).toBe(0.815);
    expect(seg(r, "mother", "maternity")[0].monthlyAmount).toBe(5626.11);
    expect(seg(r, "mother", "parental")[0].rate).toBe(0.815);
    expect(r.deadlines.some((d) => d.id === "averaged.req" && d.date === "2026-12-22")).toBe(true);
  });

  it("macierzyński przed porodem zawsze 100% i liczy się do 20 tyg.", () => {
    const r = calculate(birth({ plan: { averaged: true, prenatalWeeks: 4 } }));
    const pre = seg(r, "mother", "prenatal")[0];
    expect(pre.start).toBe(addDays("2026-12-01", -28));
    expect(pre.rate).toBe(1);
    expect(seg(r, "mother", "maternity")[0].days).toBe(16 * 7);
  });

  it("bliźnięta: 31 tyg. macierzyńskiego i pula 43 tyg.", () => {
    const r = calculate(birth({ childrenCount: 2 }));
    expect(seg(r, "mother", "maternity")[0].days).toBe(31 * 7);
    expect(r.weeks.parentalPool).toBe(43);
    expect(seg(r, "mother", "parental")[0].days).toBe(34 * 7);
  });

  it("Za życiem: pula 65 tyg.", () => {
    const r = calculate(birth({ zaZyciem: true }));
    expect(r.weeks.parentalPool).toBe(65);
    expect(seg(r, "mother", "parental")[0].days).toBe(56 * 7);
  });

  it("podział z ojcem: 9 tyg. ojca zawsze 70%, część wspólna wg wariantu", () => {
    const r = calculate(
      birth({
        father: employee(10000),
        plan: { averaged: true, parentalFatherWeeks: 15 },
      }),
    );
    const excl = seg(r, "father", "parental_exclusive")[0];
    const shared = seg(r, "father", "parental")[0];
    expect(excl.days).toBe(63);
    expect(excl.rate).toBe(0.7);
    expect(shared.days).toBe(42);
    expect(shared.rate).toBe(0.815);
    expect(seg(r, "mother", "parental")[0].days).toBe(26 * 7);
    // sekwencyjnie: ojciec po matce
    expect(excl.start).toBe(addDays(seg(r, "mother", "parental")[0].end, 1));
    expect(r.weeks.parentalUnused).toBe(0);
  });

  it("ojciec przejmuje macierzyński po 14 tyg.; mniej niż 14 → walidacja", () => {
    const r = calculate(birth({ father: employee(), plan: { motherMaternityWeeksAfterBirth: 10 } }));
    expect(r.validation.some((v) => v.includes("14 tygodni"))).toBe(true);
    expect(seg(r, "mother", "maternity")[0].days).toBe(98);
    expect(seg(r, "father", "maternity_transfer")[0].days).toBe(42);
  });

  it("urlop ojcowski 14 dni, termin do 12. miesiąca życia", () => {
    const r = calculate(birth({ father: employee() }));
    const pat = seg(r, "father", "paternity")[0];
    expect(pat.days).toBe(14);
    expect(pat.rate).toBe(1);
    expect(r.deadlines.find((d) => d.id === "paternity.expires")?.date).toBe("2027-11-30");
  });

  it("matka nieubezpieczona — ojciec: ojcowski + rodzicielski max 32 tyg.", () => {
    const r = calculate(
      birth({ mother: { title: "none" }, father: employee(), plan: { parentalFatherWeeks: 41 } }),
    );
    expect(seg(r, "mother", "maternity")).toHaveLength(0);
    const fatherParental = r.segments.filter((x) => x.parent === "father" && x.kind.startsWith("parental"));
    expect(fatherParental.reduce((a, x) => a + x.days, 0)).toBe(32 * 7);
    expect(r.validation.length).toBeGreaterThan(0);
  });

  it("łączenie z pracą na ½ etatu: zasiłek × 0,5 i wydłużenie o połowę okresu", () => {
    const r = calculate(birth({ plan: { partTime: { parent: "mother", fraction: 0.5, weeks: 20 } } }));
    const combined = r.segments.find((x) => x.workFraction === 0.5)!;
    expect(combined.days).toBe(140);
    expect(combined.monthlyAmount).toBe(2416.12);
    const ext = seg(r, "mother", "parental_extension")[0];
    expect(ext.days).toBe(70);
    expect(r.deadlines.some((d) => d.id.endsWith(".pt"))).toBe(true);
  });

  it("łączenie z pracą przy zleceniu → walidacja, bez zmian", () => {
    const r = calculate(
      birth({
        mother: { title: "mandate", voluntarySickness: true, insuranceStart: "2024-01-01", basis: { mode: "gross", monthlyGross: 6000 } },
        plan: { partTime: { parent: "mother", fraction: 0.5, weeks: 10 } },
      }),
    );
    expect(r.segments.every((x) => x.workFraction === 0)).toBe(true);
    expect(r.validation.some((v) => v.includes("pracowników"))).toBe(true);
  });

  it("kwota nie niższa niż świadczenie rodzicielskie (1000 zł)", () => {
    const r = calculate(
      birth({
        mother: {
          title: "mandate",
          voluntarySickness: true,
          insuranceStart: "2024-01-01",
          basis: { mode: "declared", monthlyBases: Array(12).fill(600), minBaseType: "none" },
        },
      }),
    );
    expect(seg(r, "mother", "parental")[0].monthlyAmount).toBe(1000);
  });

  it("suma miesięcy = suma segmentów", () => {
    const r = calculate(birth({ father: employee(9000), plan: { averaged: true, parentalFatherWeeks: 9 } }));
    const monthlySum = r.monthly.reduce((a, m) => a + m.total, 0);
    expect(monthlySum).toBeCloseTo(r.totals.all, 0);
    expect(r.totals.netEstimate).toBeLessThan(r.totals.all);
  });
});

describe("uzupełniający urlop macierzyński", () => {
  it.each([
    [{ gestationWeek: 26, birthWeightG: 900, hospitalDays: 60 }, 9],
    [{ gestationWeek: 26, birthWeightG: 900, hospitalDays: 120 }, 15],
    [{ gestationWeek: 32, birthWeightG: 1500, hospitalDays: 70 }, 8],
    [{ gestationWeek: 32, birthWeightG: 1500, hospitalDays: 15 }, 3],
    [{ gestationWeek: 39, birthWeightG: 3300, hospitalDays: 10, hospitalStartDay: 3 }, 0],
    [{ gestationWeek: 39, birthWeightG: 3300, hospitalDays: 10, hospitalStartDay: 6 }, 2],
    [{ gestationWeek: 39, birthWeightG: 3300, hospitalDays: 1, hospitalStartDay: 6 }, 0],
  ])("%o → %i tyg.", (prem, weeks) => {
    expect(supplementaryWeeks(prem, p).weeks).toBe(weeks);
  });

  it("dokłada się bezpośrednio po macierzyńskim, 100%", () => {
    const r = calculate(birth({ premature: { gestationWeek: 30, birthWeightG: 1200, hospitalDays: 40 } }));
    const sup = seg(r, "mother", "supplementary")[0];
    expect(sup.days).toBe(42);
    expect(sup.start).toBe(addDays(seg(r, "mother", "maternity")[0].end, 1));
    expect(seg(r, "mother", "parental")[0].start).toBe(addDays(sup.end, 1));
  });
});

describe("strata dziecka", () => {
  it("martwe urodzenie → 8 tygodni", () => {
    const r = calculate(birth({ loss: { type: "stillbirth" }, father: employee() }));
    const loss = seg(r, "mother", "loss")[0];
    expect(loss.days).toBe(56);
    expect(loss.rate).toBe(1);
    expect(r.segments.some((x) => x.parent === "father")).toBe(false);
  });

  it("zgon w 50. dniu życia → do 7 dni po zgonie (dłużej niż 8 tyg.)", () => {
    const death = addDays("2026-12-01", 50);
    const r = calculate(birth({ loss: { type: "death", deathDate: death } }));
    expect(seg(r, "mother", "loss")[0].end).toBe(addDays(death, 6));
    expect(seg(r, "mother", "loss")[0].days).toBe(57);
  });

  it("zgon po 8 tygodniach życia → 7 dni od zgonu", () => {
    const death = addDays("2026-12-01", 100);
    const r = calculate(birth({ loss: { type: "death", deathDate: death } }));
    expect(seg(r, "mother", "loss")[0].end).toBe(addDays(death, 6));
  });

  it("bliźnięta, jedno żyje → wymiar jak dla 1 dziecka", () => {
    const r = calculate(birth({ childrenCount: 2, loss: { type: "stillbirth", survivingChildren: 1 } }));
    expect(seg(r, "mother", "maternity")[0].days).toBe(140);
  });
});

describe("przysposobienie i rodzina zastępcza", () => {
  const adopt = (extra: Partial<Scenario>): Scenario => ({
    event: "adoption",
    today: TODAY,
    placementDate: "2026-12-01",
    childBirthDate: "2020-06-01",
    childrenCount: 1,
    mother: employee(),
    ...extra,
  });

  it("adopcja 6-latka → 20 tyg. na warunkach + 41 tyg. puli", () => {
    const r = calculate(adopt({}));
    expect(seg(r, "mother", "adoption_maternity")[0].days).toBe(140);
    expect(r.weeks.parentalPool).toBe(41);
  });

  it("rodzina zastępcza: dziecko tuż przed 7. urodzinami → minimum 9 tyg. i pula 38", () => {
    const r = calculate(adopt({ event: "foster", childBirthDate: "2020-01-15" }));
    expect(seg(r, "mother", "adoption_maternity")[0].days).toBe(63);
    expect(r.weeks.parentalPool).toBe(38);
  });

  it("rodzina zastępcza: 7-latek → brak prawa (bez odroczenia), z odroczeniem — jest", () => {
    const no = calculate(adopt({ event: "foster", childBirthDate: "2019-06-01" }));
    expect(no.eligibility[0].status).toBe("not_eligible");
    const yes = calculate(adopt({ event: "foster", childBirthDate: "2019-06-01", schoolDeferred: true }));
    expect(seg(yes, "mother", "adoption_maternity")[0].days).toBe(140);
  });

  it("adopcja 14-latka → brak prawa", () => {
    const r = calculate(adopt({ childBirthDate: "2012-01-01" }));
    expect(r.eligibility[0].status).toBe("not_eligible");
  });

  it("rodzina zastępcza — bez urlopu ojcowskiego", () => {
    const r = calculate(adopt({ event: "foster", father: employee() }));
    expect(seg(r, "father", "paternity")).toHaveLength(0);
  });

  it("termin wniosku: 7 dni od przyjęcia", () => {
    const r = calculate(adopt({}));
    expect(r.deadlines.find((d) => d.id === "adoption.req")?.date).toBe("2026-12-08");
  });
});

describe("zasiłek chorobowy w ciąży", () => {
  it("pracownica: 33 dni wynagrodzenia chorobowego, potem zasiłek 100%", () => {
    const r = calculate({
      event: "pregnancy",
      today: TODAY,
      dueDate: "2026-12-20",
      mother: employee(),
      sickLeaves: [{ from: "2026-06-01", to: "2026-08-31", pregnancyCodeB: true }],
    });
    const pay = seg(r, "mother", "sick_pay")[0];
    const sick = seg(r, "mother", "sickness")[0];
    expect(pay.days).toBe(33);
    expect(pay.paidBy).toBe("employer");
    expect(sick.days).toBe(spanDays("2026-06-01", "2026-08-31") - 33);
    expect(sick.rate).toBe(1);
  });

  it("pracownica 50+: 14 dni wynagrodzenia chorobowego", () => {
    const r = calculate({
      event: "pregnancy",
      today: TODAY,
      dueDate: "2026-12-20",
      mother: employee(8000, { age: 51 }),
      sickLeaves: [{ from: "2026-06-01", to: "2026-06-30", pregnancyCodeB: true }],
    });
    expect(seg(r, "mother", "sick_pay")[0].days).toBe(14);
  });

  it("JDG: 90 dni wyczekiwania przy dobrowolnym", () => {
    const r = calculate({
      event: "pregnancy",
      today: TODAY,
      dueDate: "2026-12-20",
      mother: {
        title: "business",
        voluntarySickness: true,
        insuranceStart: "2026-05-01",
        basis: { mode: "declared", monthlyBases: [], minBaseType: "standard" },
      },
      sickLeaves: [{ from: "2026-06-01", to: "2026-09-30", pregnancyCodeB: true }],
    });
    const sick = seg(r, "mother", "sickness")[0];
    expect(sick.start).toBe("2026-07-30");
    expect(seg(r, "mother", "sick_pay")).toHaveLength(0);
  });

  it("zwolnienie kończy się dzień przed macierzyńskim", () => {
    const r = calculate({
      event: "birth",
      today: TODAY,
      birthDate: "2026-12-01",
      mother: employee(),
      sickLeaves: [{ from: "2026-10-01", to: "2026-12-31", pregnancyCodeB: true }],
    });
    expect(seg(r, "mother", "sickness")[0].end).toBe("2026-11-30");
  });
});

describe("ryzyka i dokumenty", () => {
  it("ubezpieczenie od ciąży → ryzyko pozorności", () => {
    const r = calculate(
      birth({ dueDate: "2026-12-01", mother: employee(15000, { insuranceStart: "2026-06-01" }) }),
    );
    expect(r.risks.some((x) => x.id === "mother.recentStart")).toBe(true);
  });

  it("ojciec bez 9 tygodni → ostrzeżenie o przepadku", () => {
    const r = calculate(birth({ father: employee() }));
    expect(r.risks.some((x) => x.id === "father.exclusiveUnused")).toBe(true);
  });

  it("JDG: ZAM do ZUS przez eZUS", () => {
    const r = calculate(
      birth({
        mother: {
          title: "business",
          voluntarySickness: true,
          insuranceStart: "2023-01-01",
          basis: { mode: "declared", monthlyBases: Array(12).fill(5652), minBaseType: "standard" },
        },
      }),
    );
    const zam = r.documents.find((d) => d.code === "ZAM");
    expect(zam?.submitTo).toBe("zus");
    expect(r.payer.mother?.who).toBe("zus");
  });

  it("pracownica u małego płatnika → wniosek u pracodawcy + Z-3 do ZUS", () => {
    const r = calculate(birth({ mother: employee(8000, { payerInsuredCount: 8 }) }));
    expect(r.documents.some((d) => d.code === "Z-3")).toBe(true);
    expect(r.payer.mother?.who).toBe("zus");
  });
});

describe("przejęcie urlopu macierzyńskiego przez ojca w sytuacjach szczególnych (KP art. 180 § 6–15)", () => {
  const seg = (s: Scenario) => calculate(s).segments.filter((x) => x.kind === "maternity" || x.kind === "maternity_transfer");
  const withFather = (motherUnable: NonNullable<Scenario["plan"]>["motherUnable"]): Scenario =>
    birth({ father: employee(9000), plan: { motherUnable } as Scenario["plan"] });

  it("niezdolność do samodzielnej egzystencji: przejęcie po 8 tygodniach (wcześniej niż 14)", () => {
    const s = seg(withFather({ reason: "incapacity", afterWeeks: 8 }));
    expect(s.find((x) => x.parent === "mother")!.days).toBe(56);
    expect(s.find((x) => x.parent === "father")!.days).toBe(12 * 7);
  });

  it("przed upływem 8 tygodni — przyjmuje minimum 8 i ostrzega", () => {
    const r = calculate(withFather({ reason: "abandonment", afterWeeks: 3 }));
    expect(r.segments.find((x) => x.kind === "maternity")!.days).toBe(56);
    expect(r.validation.join(" ")).toMatch(/co najmniej 8 tygodni/);
  });

  it("zgon matki: bez minimalnego okresu — ojciec od dnia zdarzenia", () => {
    const s = seg(withFather({ reason: "death", afterWeeks: 2 }));
    expect(s.find((x) => x.parent === "mother")!.days).toBe(14);
    expect(s.find((x) => x.parent === "father")!.days).toBe(18 * 7);
  });

  it("szpital: ojciec na czas pobytu, potem matka kontynuuje", () => {
    const s = seg(withFather({ reason: "hospital", afterWeeks: 9, hospitalWeeks: 3 }));
    expect(s.map((x) => [x.parent, x.days / 7])).toEqual([
      ["mother", 9],
      ["father", 3],
      ["mother", 8],
    ]);
  });

  it("matka nieubezpieczona zmarła — ojciec dostaje pozostałą część urlopu macierzyńskiego (§ 15)", () => {
    const s = seg({
      ...withFather({ reason: "death", afterWeeks: 4 }),
      mother: { title: "none" },
    });
    expect(s).toHaveLength(1);
    expect(s[0].parent).toBe("father");
    expect(s[0].days).toBe(16 * 7);
  });
});

describe("urlop ojcowski — tata zaczął pracę po urodzeniu dziecka", () => {
  it("ojcowski od dnia objęcia ubezpieczeniem, jeśli dziecko nie ma 12 miesięcy", () => {
    const r = calculate(birth({ father: employee(9000, { insuranceStart: "2027-03-01" }) }));
    const pat = r.segments.find((x) => x.kind === "paternity");
    expect(pat?.start).toBe("2027-03-01");
    expect(pat?.days).toBe(14);
  });
  it("praca podjęta po 12. miesiącu życia dziecka — prawo wygasło", () => {
    const r = calculate(birth({ father: employee(9000, { insuranceStart: "2028-01-10" }) }));
    expect(r.segments.find((x) => x.kind === "paternity")).toBeUndefined();
  });
});
