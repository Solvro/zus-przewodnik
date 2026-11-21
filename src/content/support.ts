/**
 * Organizacje o charakterze charytatywnym / telefony wsparcia (wymaganie R9, S8).
 * Lista przykładowa — przed wdrożeniem ZUS weryfikuje status i kontakty (edycja w panelu admina).
 */
export type SupportTopic = "loss" | "premature" | "illness" | "crisis";

export interface SupportOrg {
  id: string;
  name: string;
  topics: SupportTopic[];
  description: string;
  url?: string;
  phone?: string;
}

export const SUPPORT_TOPICS: Record<SupportTopic, string> = {
  loss: "Strata dziecka i poronienie",
  premature: "Wcześniak",
  illness: "Ciężka choroba dziecka",
  crisis: "Kryzys emocjonalny — pomoc od zaraz",
};

export const SUPPORT_ORGS: SupportOrg[] = [
  {
    id: "rpl",
    name: "Fundacja Rodzić po Ludzku",
    topics: ["loss"],
    description: "Informacje o prawach rodziców po poronieniu i stracie dziecka, materiały i wskazówki, gdzie szukać pomocy.",
    url: "https://rodzicpoludzku.pl",
  },
  {
    id: "wczesniak",
    name: "Fundacja Wcześniak Rodzice–Rodzicom",
    topics: ["premature"],
    description: "Wsparcie i wiedza dla rodziców dzieci urodzonych przedwcześnie — od oddziału neonatologii po pierwsze lata.",
    url: "https://wczesniak.pl",
  },
  {
    id: "gajusz",
    name: "Fundacja Gajusz",
    topics: ["illness", "loss"],
    description: "Hospicjum perinatalne i opieka nad ciężko chorymi dziećmi oraz ich rodzinami.",
    url: "https://gajusz.org.pl",
  },
  {
    id: "whd",
    name: "Warszawskie Hospicjum dla Dzieci",
    topics: ["illness", "loss"],
    description: "Opieka perinatalna i paliatywna, wsparcie psychologiczne dla rodziców w żałobie.",
    url: "https://hospicjum.waw.pl",
  },
  {
    id: "mammarzenie",
    name: "Fundacja Mam Marzenie",
    topics: ["illness"],
    description: "Spełnia marzenia dzieci z chorobami zagrażającymi życiu.",
    url: "https://mammarzenie.org",
  },
  {
    id: "centrumwsparcia",
    name: "Centrum Wsparcia dla Osób w Stanie Kryzysu Psychicznego",
    topics: ["crisis", "loss"],
    description: "Bezpłatna, całodobowa pomoc psychologiczna przez telefon.",
    phone: "800 70 2222",
    url: "https://centrumwsparcia.pl",
  },
  {
    id: "116123",
    name: "Telefon zaufania dla dorosłych w kryzysie emocjonalnym",
    topics: ["crisis", "loss"],
    description: "Bezpłatny numer wsparcia emocjonalnego.",
    phone: "116 123",
  },
];

export const OFFICIAL_LINKS = [
  { title: "ZUS — zasiłek macierzyński", url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski", desc: "Zasady, formularze i wyjaśnienia ZUS." },
  { title: "ZUS — wzory formularzy (zasiłki)", url: "https://www.zus.pl/baza-wiedzy/wzory-formularzy/zasilki", desc: "ZAM, Z-3, Z-3a, ZAS-53 i inne." },
  { title: "Ministerstwo Rodziny — urlop rodzicielski", url: "https://www.gov.pl/web/rodzina/urlop-rodzicielski", desc: "Urlopy związane z rodzicielstwem." },
  { title: "Państwowa Inspekcja Pracy — rodzicielstwo", url: "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo", desc: "Prawa pracownika-rodzica, ochrona przed zwolnieniem." },
  { title: "gov.pl — odpis aktu urodzenia", url: "https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego", desc: "Rejestr stanu cywilnego." },
];
