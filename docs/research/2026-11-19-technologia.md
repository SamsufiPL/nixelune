# Wybór technologii (2026-11-19)

Decyzja: **D-01** w `docs/decisions.md`.

## Wymagania twórcy

Android w pierwszej kolejności, iOS później; rozwiązanie „najlepsze, zoptymalizowane
i lekkie”. Gra jest spokojną układanką 2D na siatce heksów: mało obiektów, wektorowa
grafika, brak fizyki, brak sieci.

## Wybór

TypeScript (strict) + Vite + Canvas 2D dla planszy + HTML/CSS dla interfejsu,
opakowane w Capacitor 8.

| Kryterium | Ocena wybranego stosu |
|---|---|
| Rozmiar pakietu | Zmierzone 2026-11-19 na powłoce z zastępczą stroną: APK debug 4,3 MB; APK release po R8 i usuwaniu zasobów 1,0 MB (podpisany kluczem jednorazowym, tylko do pomiaru). Gra doda własny kod i font Inter. |
| Szybkość iteracji | Gra działa w przeglądarce (`npm run dev`), testy symulacji w Vitest bez urządzenia; na telefon wystarczy `npm run android:debug`. |
| Dostępność | HUD i ekrany to semantyczny HTML: czytnik ekranu (TalkBack / VoiceOver), skalowanie tekstu i fokus działają bez pisania własnej warstwy dostępności. |
| Port na iOS | Ten sam kod web; `npx cap add ios` dodaje powłokę. Usługi natywne są za adapterami w `src/services`. Wymaga Maca i konta Apple do zbudowania. |
| Wydajność | Ryzyko: WebView jest wolniejszy od natywnego renderowania i różni się między urządzeniami. |

### Ryzyko wydajności WebView i jak je ograniczamy

- Plansza ma 135 pól; rysujemy płaskie sześciokąty bez rozmycia i bez filtrów
  (zgodnie z zasadami stylu), więc koszt klatki jest mały.
- Symulacja jest oddzielona od rysowania i nie zależy od liczby klatek.
- Animacje trwają 120–260 ms; przy „ogranicz ruch” są wyłączane.
- Minimalny Android to 7.0 (API 24), ale WebView aktualizuje się przez sklep niezależnie
  od systemu.
- **Niesprawdzone:** nie mierzyliśmy jeszcze płynności na prawdziwym, słabym telefonie.
  To pozycja w planie (`docs/roadmap.md`). Jeśli wynik będzie zły, rysowanie planszy
  można przenieść na WebGL bez zmiany symulacji.

## Odrzucone alternatywy

Rozmiary poniżej to rząd wielkości znany agentowi z dokumentacji i praktyki, **nie
pomiary z tego projektu**.

| Technologia | Dlaczego nie |
|---|---|
| **Godot** | Pełny silnik: pusty eksport na Androida to kilkadziesiąt MB. Interfejs rysowany przez silnik, więc dostępność (czytnik ekranu, skalowanie tekstu) trzeba budować osobno. Za ciężki dla układanki 2D. |
| **Phaser** | Też działa w WebView, ale dokłada silnik (około 1 MB kodu), z którego potrzebowalibyśmy tylko rysowania sześciokątów. Canvas 2D wystarcza. |
| **Flutter / Flame** | Dobra wydajność i jeden kod, ale większy pakiet (silnik rzędu kilku MB na architekturę), osobny język (Dart) i brak szybkiej iteracji w zwykłej przeglądarce z tym samym renderowaniem. Dostępność w widoku gry Flame wymaga ręcznej pracy. |
| **Defold** | Lekki i wydajny, ale interfejs rysuje silnik (ta sama luka w dostępności), a skrypty w Lua oznaczają słabsze typowanie i inne narzędzia testowe. |
| **Natywny Kotlin** | Najmniejszy i najszybszy na Androidzie, ale port na iOS oznacza napisanie gry drugi raz. |

## Co wybór kosztuje

- Zależność od wersji WebView na urządzeniu gracza.
- Dźwięk przez Web Audio (dlatego D-06: synteza w kodzie).
- Część funkcji sklepowych (zakupy, osiągnięcia) wymaga wtyczek Capacitora — na razie
  nieplanowane.
