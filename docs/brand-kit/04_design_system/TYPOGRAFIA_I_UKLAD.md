# Typografia i zasady kompozycji

**Kroje:** Inter Display lub Inter (systemowe/instalowane z osobnej, licencjonowanej dystrybucji); bez dołączania fontów. Alternatywa: system-ui / Segoe UI / Arial. Rodzina krojów jest minimalistyczna, a indywidualność wynika z proporcji, odstępów i autorskiego symbolu.

| Styl | Desktop | Mobile | Waga | Tracking |
|---|---:|---:|---:|---:|
| Logo | 42–60 px | 29–36 px | 450 | +0.12em |
| Wynik główny | 44–64 px | 27–36 px | 350–450 | +0.02em |
| Nagłówek sekcji | 18–25 px | 16–20 px | 500 | +0.02em |
| Etykieta HUD | 11–13 px | 11–12 px | 600 | +0.12em |
| Tekst pomocniczy | 14–16 px | 13–15 px | 400 | 0 |
| Button | 14–17 px | 14–16 px | 600 | +0.06em |

**Siatka:** jednostka bazowa 8 px. Odstępy: 8, 16, 24, 32, 48, 64 px. Margines bezpieczny mobile: co najmniej 16 px + safe-area systemowa. Odległość między elementami interaktywnymi: min. 8 px. Rozmiar obszaru dotyku: min. 44×44 CSS px, docelowo 48×48.

**Hierarchia:** plansza ma najwyższy priorytet. Punktacja jest drugorzędna. Misja zajmuje jedną linię z możliwością rozwinięcia. Główne akcje znajdują się w strefie kciuka.

**Przykładowe breakpointy:** mobile do 699 CSS px; tablet 700–1099; desktop od 1100. Prototyp nie jest układem 1:1 do 320 px; wymaga testów na małych ekranach.

**Kopiowanie w aplikacji:** krótkie czasowniki: „Połącz”, „Obróć”, „Upuść”, „Zamień”, „Dalej”. Bez pseudo-poetyckich sloganów w trakcie rozgrywki. Slogan występuje tylko w komunikacji marketingowej: „Połącz światło. Zmień układ.”
