/** Słowniczek — każdy kod i termin urzędowy wyjaśniony prostym językiem. */
export const GLOSSARY: Record<string, { term: string; short: string }> = {
  "e-ZLA": {
    term: "e-ZLA",
    short: "Elektroniczne zwolnienie lekarskie. Lekarz wysyła je sam do ZUS i do pracodawcy — nie musisz go nigdzie zanosić.",
  },
  "kod-B": {
    term: "Kod „B”",
    short: "Oznaczenie na zwolnieniu, że niezdolność do pracy przypada w ciąży. Dzięki niemu zasiłek chorobowy wynosi 100%.",
  },
  ZAM: {
    term: "ZAM",
    short: "Wniosek o zasiłek macierzyński. Od 24.10.2026 obejmuje też dawne wnioski ZUR (rodzicielski) i ZAO (ojcowski).",
  },
  "Z-3": {
    term: "Z-3",
    short: "Zaświadczenie, które wystawia pracodawca dla ZUS — zawiera m.in. Twoje wynagrodzenie potrzebne do wyliczenia zasiłku.",
  },
  "Z-3a": {
    term: "Z-3a",
    short: "Zaświadczenie płatnika dla osób na umowie zlecenia (i innych niebędących pracownikami).",
  },
  "Z-3b": {
    term: "Z-3b",
    short: "Dawne zaświadczenie dla osób prowadzących działalność. Zlikwidowane 24.10.2026 — wystarczy wniosek ZAM.",
  },
  "ZAS-53": {
    term: "ZAS-53",
    short: "Wniosek o zasiłek chorobowy składany do ZUS przez osoby prowadzące działalność gospodarczą.",
  },
  "ZAS-12": {
    term: "ZAS-12",
    short: "Zaświadczenie płatnika na kolejne okresy zasiłku chorobowego (gdy Z-3 już zostało złożone).",
  },
  podstawa: {
    term: "Podstawa wymiaru zasiłku",
    short: "Kwota, od której liczy się zasiłek: średnie wynagrodzenie (lub przychód) z 12 miesięcy minus 13,71% składek.",
  },
  platnik: {
    term: "Płatnik składek",
    short: "Pracodawca lub zleceniodawca, który zgłasza Cię do ubezpieczeń. Jeśli zgłasza ponad 20 osób, sam wypłaca zasiłki.",
  },
  "za-zyciem": {
    term: "Zaświadczenie „Za życiem”",
    short: "Wydaje lekarz specjalista, gdy u dziecka stwierdzono ciężkie, nieodwracalne upośledzenie lub nieuleczalną chorobę. Wydłuża urlop rodzicielski do 65–67 tygodni.",
  },
  eZUS: {
    term: "eZUS (PUE)",
    short: "Twoje konto w ZUS przez internet. Złożysz tu wnioski, sprawdzisz zwolnienia, składki i decyzje.",
  },
  pozornosc: {
    term: "Umowa „dla pozoru”",
    short: "Umowa zawarta tylko po to, by dostać zasiłek, bez rzeczywistej pracy. ZUS może wtedy uznać, że nie było ubezpieczenia.",
  },
  wyczekiwanie: {
    term: "Okres wyczekiwania",
    short: "Czas ubezpieczenia potrzebny do zasiłku chorobowego: 30 dni (umowa o pracę) lub 90 dni (dobrowolnie). Zasiłek macierzyński go nie wymaga.",
  },
  uzupelniajacy: {
    term: "Uzupełniający urlop macierzyński",
    short: "Dodatkowy urlop dla rodziców wcześniaków i dzieci hospitalizowanych po porodzie: tydzień za każdy tydzień w szpitalu, do 8 lub 15 tygodni.",
  },
  "81,5": {
    term: "Wariant 81,5%",
    short: "Zamiast 100% za macierzyński i 70% za rodzicielski dostajesz stałe 81,5% przez cały okres. Wniosek: do 21 dni po porodzie.",
  },
};
