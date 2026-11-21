import type { Metadata } from "next";
import { Accordion } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/primitives";
import { SupportOrgs } from "@/components/support/support-orgs";

export const metadata: Metadata = { title: "Trudna sytuacja — co przysługuje" };

/*
 * Ścieżka trauma-informed: spokojny ton, bez ilustracji i gratulacji,
 * najpierw wsparcie, potem minimum formalności.
 */
const ITEMS = [
  {
    id: "stillbirth",
    title: "Dziecko urodziło się martwe lub zmarło",
    body: (
      <>
        <p>Masz prawo do zasiłku macierzyńskiego w wysokości <strong>100%</strong> podstawy:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>gdy dziecko urodziło się martwe lub zmarło przed upływem 8 tygodni życia — przez <strong>8 tygodni po porodzie</strong>, ale nie krócej niż 7 dni od śmierci dziecka;</li>
          <li>gdy dziecko zmarło po 8 tygodniach życia — przez <strong>7 dni</strong> od dnia śmierci;</li>
          <li>przy porodzie mnogim — wymiar jak dla dzieci, które żyją.</li>
        </ul>
        <p className="mt-2">Dotyczy to zarówno pracownic, jak i osób na zleceniu czy działalności — jeśli podlegały ubezpieczeniu chorobowemu. Przysługuje też <strong>zasiłek pogrzebowy</strong>.</p>
        <p className="mt-2"><strong>Dokumenty:</strong> odpis skrócony aktu urodzenia z adnotacją o martwym urodzeniu, a gdy aktu nie sporządzono — zaświadczenie o martwym urodzeniu (lekarz położnik-ginekolog lub położna). Możesz poprosić ZUS, by sam pobrał odpis z rejestru stanu cywilnego.</p>
        <p className="mt-2 text-sm text-muted">Kodeks pracy art. 180¹; ustawa zasiłkowa art. 29a, 31 ust. 1.</p>
      </>
    ),
  },
  {
    id: "miscarriage",
    title: "Poronienie",
    body: (
      <>
        <p>Jeśli możliwe jest sporządzenie aktu urodzenia (z adnotacją o martwym urodzeniu), przysługują te same prawa co przy martwym urodzeniu — w tym 8 tygodni zasiłku macierzyńskiego i zasiłek pogrzebowy. W innym przypadku lekarz może wystawić zwolnienie lekarskie.</p>
        <p className="mt-2">Szpital powinien wydać kartę martwego urodzenia, jeśli rodzice o to poproszą — warto o nią zapytać.</p>
      </>
    ),
  },
  {
    id: "premature",
    title: "Wcześniak lub dziecko w szpitalu po porodzie",
    body: (
      <>
        <p>Po urlopie macierzyńskim przysługuje <strong>uzupełniający urlop macierzyński</strong> (100%): tydzień za każdy tydzień pobytu dziecka w szpitalu — do 15 tygodni (urodzenie przed 28. tc lub masa ≤ 1000 g) albo do 8 tygodni (pozostałe przypadki).</p>
        <p className="mt-2">Mama, która wykorzystała 8 tygodni macierzyńskiego, może przerwać urlop i wykorzystać resztę po wyjściu dziecka ze szpitala.</p>
        <p className="mt-2"><strong>Wniosek:</strong> najpóźniej 21 dni przed końcem urlopu macierzyńskiego, z zaświadczeniem ze szpitala.</p>
      </>
    ),
  },
  {
    id: "mother-hospital",
    title: "Mama jest w szpitalu lub nie może opiekować się dzieckiem",
    body: (
      <p>
        Po wykorzystaniu przez mamę co najmniej <strong>8 tygodni</strong> zasiłku po porodzie tata (lub inny członek najbliższej rodziny) może przejąć zasiłek na czas jej pobytu w szpitalu. Jeśli mama ma orzeczenie o niezdolności do samodzielnej egzystencji, może przekazać pozostałą część urlopu po 8 tygodniach.
      </p>
    ),
  },
  {
    id: "mother-death",
    title: "Śmierć mamy lub porzucenie dziecka",
    body: (
      <p>
        Tata lub inny członek najbliższej rodziny ma prawo do pozostałej części urlopu i zasiłku macierzyńskiego — także wtedy, gdy mama nie była ubezpieczona. Pomożemy przygotować wniosek.
      </p>
    ),
  },
  {
    id: "illness",
    title: "Ciężka, nieuleczalna choroba dziecka („Za życiem”)",
    body: (
      <p>
        Z zaświadczeniem „Za życiem” urlop rodzicielski wydłuża się do <strong>65 tygodni</strong> (67 przy wieloraczkach). Łącząc go z pracą na część etatu, zasiłek może być wypłacany nawet do 130 (134) tygodni. Zaświadczenie wystawia lekarz specjalista (m.in. położnictwa i ginekologii, neonatologii, neurologii, kardiologii lub chirurgii dziecięcej).
      </p>
    ),
  },
];

export default function TrudnaSytuacjaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black text-navy">Trudna sytuacja</h1>
      <p className="prose-zus mt-2 text-lg text-muted">
        Bardzo nam przykro, że tu jesteś. Poniżej krótko i spokojnie wyjaśniamy, co Ci przysługuje. Nie musisz załatwiać wszystkiego od razu.
      </p>

      <section className="mt-6" aria-label="Organizacje wsparcia">
        <SupportOrgs filter="loss" compact />
      </section>

      <section className="mt-8" aria-labelledby="prawa">
        <h2 id="prawa" className="mb-3 text-xl font-bold text-navy">Co przysługuje</h2>
        <Accordion items={ITEMS} />
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/kalkulator">Policz dokładnie dla mnie</ButtonLink>
        <ButtonLink href="/asystent" variant="secondary">Zadaj pytanie</ButtonLink>
      </div>
    </div>
  );
}
