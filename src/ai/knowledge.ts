/**
 * Własna, zwięzła baza wiedzy projektu (opracowanie reguł 2026) — używana przez asystenta,
 * gdy pełny korpus materiałów źródłowych nie jest dostępny na serwerze.
 */
export const KNOWLEDGE = `
ZASIŁEK CHOROBOWY W CIĄŻY
- Przysługuje osobie podlegającej ubezpieczeniu chorobowemu: obowiązkowo (umowa o pracę) po 30 dniach, dobrowolnie (zlecenie, działalność) po 90 dniach nieprzerwanego ubezpieczenia (okres wyczekiwania). Wcześniejsze okresy wlicza się, jeśli przerwa nie przekroczyła 30 dni.
- Zwolnienie lekarskie e-ZLA z kodem „B” (ciąża) → zasiłek 100% podstawy wymiaru. Okres zasiłkowy w ciąży: do 270 dni (standardowo 182).
- Pracownica: za pierwsze 33 dni choroby w roku (14 dni od 50. roku życia) płaci pracodawca (wynagrodzenie chorobowe), potem zasiłek. Osoby niebędące pracownikami — zasiłek od 1. dnia.
- Po wyczerpaniu 270 dni — świadczenie rehabilitacyjne (w ciąży 100%), do 12 miesięcy, jeśli leczenie rokuje odzyskanie zdolności do pracy.
- Gdy umowę rozwiązano w ciąży z powodu upadłości, likwidacji lub śmierci pracodawcy — zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu.
- Umowa terminowa lub na okres próbny (> 1 miesiąc), która skończyłaby się po 3. miesiącu ciąży, przedłuża się do dnia porodu.

ZASIŁEK MACIERZYŃSKI — ZASADY OGÓLNE
- Wymaga podlegania ubezpieczeniu chorobowemu w dniu porodu lub przyjęcia dziecka. Nie ma okresu wyczekiwania.
- Wypłaca płatnik zgłaszający ponad 20 ubezpieczonych (stan na 30 listopada poprzedniego roku); w pozostałych przypadkach ZUS. Osobom prowadzącym działalność zawsze ZUS.
- Osoby opłacające składki same: zaległość powyżej 1% minimalnego wynagrodzenia (2026: 48,06 zł) na dzień powstania prawa wstrzymuje wypłatę do czasu spłaty.
- Dzienna kwota = 1/30 miesięcznego zasiłku. Zasiłek nie może być niższy niż kwota świadczenia rodzicielskiego (1000 zł miesięcznie).

WYMIARY
- Urlop macierzyński: 20 tyg. (1 dziecko), 31 (2), 33 (3), 35 (4), 37 (5+). Do 6 tygodni można wykorzystać przed porodem (wniosek najpóźniej 14 dni przed). Pierwsze 14 tygodni po porodzie wyłącznie matka; resztę może przejąć ojciec (rezygnacja matki ≥ 7 dni przed powrotem do pracy).
- Urlop rodzicielski: 41 tyg. (1 dziecko), 43 (2+); z zaświadczeniem „Za życiem” 65/67. Każdemu z rodziców przysługuje 9 tygodni nieprzenoszalnych. Do 5 części, do końca roku kalendarzowego, w którym dziecko kończy 6 lat. Wniosek ≥ 21 dni przed rozpoczęciem.
- Urlop ojcowski: 2 tygodnie (jednorazowo lub 2 × 7 dni), do ukończenia przez dziecko 12 miesięcy (przy przysposobieniu 12 miesięcy od uprawomocnienia, nie dłużej niż do 14 lat). Wniosek ≥ 7 dni przed.
- Uzupełniający urlop macierzyński: tydzień za każdy tydzień pobytu dziecka w szpitalu — do 15 tyg. (urodzenie przed 28. tc lub masa ≤ 1000 g), do 8 tyg. (28.–37. tc, masa > 1000 g; albo po 37. tc przy pobycie min. 2 dni z pierwszym dniem między 5. a 28. dniem). Jednorazowo, bezpośrednio po macierzyńskim, jedno z rodziców; wniosek ≥ 21 dni przed końcem macierzyńskiego.
- Przysposobienie / rodzina zastępcza niezawodowa: urlop na warunkach urlopu macierzyńskiego 20–37 tyg. wg liczby dzieci, nie dłużej niż do 7. r.ż. (10. przy odroczeniu obowiązku szkolnego) w rodzinie zastępczej i 14. r.ż. przy przysposobieniu; nie krócej niż 9 tygodni (wtedy rodzicielski 38 tyg., z „Za życiem” 62). Wniosek w ciągu 7 dni od przyjęcia.
- Martwe urodzenie lub zgon przed 8. tygodniem życia: 8 tygodni po porodzie, nie krócej niż 7 dni od zgonu; zgon po 8. tygodniu — 7 dni od zgonu. Przysługuje też zasiłek pogrzebowy.

WYSOKOŚĆ
- 100% podstawy: urlop macierzyński (także przed porodem), na warunkach urlopu macierzyńskiego, uzupełniający, ojcowski, po stracie dziecka.
- 70%: urlop rodzicielski.
- 81,5% za cały okres macierzyńskiego i rodzicielskiego, jeśli matka złoży wniosek najpóźniej 21 dni po porodzie (przy przyjęciu dziecka — 21 dni od przyjęcia). 9 tygodni drugiego rodzica zawsze 70%. Bez żadnego dnia rodzicielskiego w 1. roku życia dziecka rodzicielski wynosi 70%, a za macierzyński przysługuje wyrównanie do 100% na wniosek.
- Łączenie rodzicielskiego z pracą (do ½ etatu u tego samego pracodawcy): zasiłek maleje proporcjonalnie do wymiaru pracy, urlop wydłuża się o iloczyn tygodni łączenia i wymiaru pracy (maks. 82/86 tyg., z „Za życiem” 130/134). Wniosek ≥ 21 dni przed podjęciem pracy.

PODSTAWA WYMIARU
- Pracownik: przeciętne miesięczne wynagrodzenie z 12 pełnych miesięcy przed miesiącem powstania prawa, minus 13,71% składek. Miesiące z mniej niż połową przepracowanego czasu pomija się. Premie kwartalne 1/12 z 4 kwartałów, roczne 1/12 z poprzedniego roku. Przy pełnym etacie nie mniej niż 4 147,10 zł (2026).
- Niepracownik: przeciętna podstawa składek chorobowych z 12 miesięcy minus 13,71%. Limit 2026: 20 321,30 zł (od 23 550 zł). Przy krótszym ubezpieczeniu JDG z deklarowaną podstawą — art. 48a (najniższa podstawa + 1/12 nadwyżki × liczba miesięcy).

RYZYKA
- Umowa lub działalność zawarta „dla pozoru” — ZUS może stwierdzić niepodleganie ubezpieczeniu.
- Podwyższenie podstawy składek w ciąży wyłącznie dla wyższego zasiłku — ZUS może obniżyć podstawę.
- Brak ubezpieczenia chorobowego w dniu porodu (koniec umowy, niezgłoszenie do dobrowolnego) — brak zasiłku macierzyńskiego.
- Ochrona przed zwolnieniem z Kodeksu pracy dotyczy tylko pracowników (umowa o pracę).

FORMULARZE (od 24.10.2026)
- ZAM — wniosek o zasiłek macierzyński (obejmuje też dawne ZUR i ZAO). Z-3 (pracownik), Z-3a (zleceniobiorca) — zaświadczenia płatnika; Z-3b zlikwidowany. ZAS-53 — wniosek o zasiłek chorobowy dla prowadzących działalność. ZAS-12 — zaświadczenie płatnika na kolejne okresy.
`.trim();
