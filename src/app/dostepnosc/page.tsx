import type { Metadata } from "next";

export const metadata: Metadata = { title: "Deklaracja dostępności" };

export default function DostepnoscPage() {
  return (
    <div className="prose-zus mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black text-navy">Deklaracja dostępności</h1>
      <p className="mt-3">Serwis projektujemy zgodnie z ustawą z 4 kwietnia 2019 r. o dostępności cyfrowej stron internetowych i aplikacji mobilnych podmiotów publicznych oraz WCAG 2.1 na poziomie AA (z elementami WCAG 2.2).</p>
      <h2 className="mt-8 text-xl font-bold text-navy">Co zapewniamy</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>Kontrast tekstu co najmniej 4,5:1 oraz tryb wysokiego kontrastu.</li>
        <li>Powiększanie tekstu (A, A+, A++) i poprawne działanie przy powiększeniu 200%.</li>
        <li>Pełna obsługa klawiaturą, widoczny fokus, link „Przejdź do treści”, fokus na nagłówku po zmianie strony.</li>
        <li>Pola formularzy z etykietami, podpowiedziami i błędami powiązanymi z polem; podsumowanie błędów z odnośnikami.</li>
        <li>Wykresy z tekstowym opisem i tabelą danych; oś czasu z widokiem listy.</li>
        <li>Informacja nie jest przekazywana samym kolorem (ikony, etykiety, wzory).</li>
        <li>Elementy dotykowe co najmniej 44 × 44 px; respektowanie ustawienia „ogranicz ruch”.</li>
        <li>Prosty język, wyjaśnienia kodów urzędowych (słowniczek) otwierane kliknięciem.</li>
      </ul>
      <h2 className="mt-8 text-xl font-bold text-navy">Znane ograniczenia</h2>
      <p className="mt-2">Prototyp nie przeszedł jeszcze zewnętrznego audytu dostępności. Podgląd wniosków do druku odwzorowuje papierowy formularz.</p>
      <h2 className="mt-8 text-xl font-bold text-navy">Kontakt</h2>
      <p className="mt-2">Uwagi dotyczące dostępności prosimy zgłaszać zespołowi projektu (w wdrożeniu — koordynatorowi dostępności ZUS).</p>
    </div>
  );
}
