# Plan prac

Stan na 2026-11-19. Decyzje: `docs/decisions.md`.

## Zrobione

- Szkielet projektu: TypeScript 7 + Vite 8 + Vitest, kontrakty w `src/game/types.ts`
  i `src/platform/types.ts`.
- Powłoka Android (Capacitor 8.6.2): ciemny start bez białego błysku, edge-to-edge,
  pion i poziom, jedyne uprawnienie to wibracje, kopia zapasowa tylko postępu,
  wydanie z R8 i wymuszonym podpisem, ikona adaptacyjna z pakietu.
- Lokalny APK debug buduje się (`npm run android:debug`).
- Test pilnujący manifestu i konfiguracji Gradle (`tests/android/manifest.test.ts`).
- CI: typy, testy, build web, APK debug jako artefakt na 2 dni (pierwszy przebieg zielony).
- Dependabot (npm, Gradle, GitHub Actions) z 7-dniowym opóźnieniem.
- Rozeznanie: technologia i nazwa (`docs/research/`).
- Rdzeń gry (`src/game`): plansza heksowa, elementy, grupy, kaskady, punktacja, etapy,
  12 wyzwań; boty i dowód wygrywalności wyzwań w `tools/`.
- Usługi (`src/services`): zapis dwuslotowy z sumą kontrolną, dźwięk syntezowany,
  wibracje, cykl życia aplikacji, tłumaczenia PL + EN.
- Interfejs (`src/ui`, `src/render`): menu, gra, pauza, panel etapu, koniec gry,
  wyzwania, ustawienia, licencje; sterowanie klawiaturą, dotykiem i przyciskami.
- APK debug z prawdziwą grą: 4,5 MB.
- Identyfikator aplikacji `pl.samsufi.nixelune` (D-08).
- Kanał testowy w przeglądarce: build web na GitHub Pages po zielonych testach
  (wymaga włączenia Pages w ustawieniach repozytorium).

## W toku

- Nowy kierunek wizualny (D-15): wybór spośród trzech propozycji, potem style, plansza,
  ikona i ekran startowy.
- Elementy mieszane (D-14).

## Następne, w kolejności

1. Pierwsza grywalna wersja na telefonie twórcy: sprawdzić start bez dostępu do sieci,
   bezpieczne marginesy (wycięcie, paski systemowe), obrót, wibracje, czytnik ekranu.
2. Pomiar płynności na słabym telefonie z Androidem (ryzyko WebView z D-01).
3. Decyzje twórcy: nazwa (D-09), widoczność repozytorium przed wydaniem (D-03).
4. Testy z graczami według listy z pakietu
   (`docs/brand-kit/08_handoff/WDROZENIE_I_CHECKLISTA.md`): czytelność w 1 sekundę na
   ekranie 360 px, 10–15 osób w różnym wieku, test bez rozróżniania kolorów.
5. Polityka prywatności (gra nie zbiera danych i nie ma dostępu do sieci — trzeba to
   opisać i zgłosić w sklepie).
6. Workflow wydania i podpisywanie: sekrety, numer wersji z CI, weryfikacja artefaktu,
   wysyłka do testów wewnętrznych, wydanie na GitHubie z `mapping.txt`.
7. Test zamknięty w Google Play; pierwsze wydanie wgrywane ręcznie.
8. Port na iOS (`npx cap add ios`), TestFlight.

## Znane długi

- Gra nie była uruchomiona na telefonie; dźwięków nikt nie słuchał, czytnik ekranu
  (TalkBack) nie był sprawdzany. Sprawdzono tylko w Chromium na komputerze.
- Rozmiar planszy liczony jednostkami `cqw`/`cqh` wymaga WebView opartego na
  Chromium 105 lub nowszym; brak zapasowego układu dla starszych.
- `formatCount` w `src/ui/format.ts` powinno trafić do silnika tłumaczeń w `src/services`.
- Brak testu integracyjnego ekranu gry (pokryty tylko przebiegami w przeglądarce).
- Etap z celem „łańcuch” nie przyspiesza, dopóki gracz nie zrobi łańcucha.
- Wibracja przy każdym przesunięciu o kolumnę może być zbyt częsta; ocenić na telefonie.
- Brak workflow wydania i podpisywania — celowo, do czasu D-03 / D-09.
- Powłoka Android nie była uruchomiona na urządzeniu ani emulatorze (tylko build).
- Brak uprawnienia INTERNET opiera się na tym, że Capacitor serwuje pliki z pakietu
  przez przechwytywanie żądań; potwierdzić na urządzeniu.
- Reguły kopii zapasowej zakładają domyślną grupę wtyczki Preferences
  (`CapacitorStorage`); zmiana grupy w `src/services` wymaga zmiany w
  `android/app/src/main/res/xml/`.
- Ikona aplikacji, ekran startowy i kolor tła Androida pochodzą z odrzuconego kierunku
  wizualnego; do wymiany po D-15 (`npm run android:icons`, `res/values/colors.xml`).
- Strona na GitHub Pages jest jedna: pokazuje build z gałęzi wdrożonej jako ostatnia.
- Narzędzia sklepowe (opisy, zrzuty ekranu, notatki wydań) nie są jeszcze zainstalowane.
- Brak ESLint (D-04).

## Odłożone pomysły

- Port na iOS.
- Workflow wydania, podpisywanie, synchronizacja opisów sklepowych.
- Test zamknięty i plan premiery.
- Polityka prywatności i strona gry.
- Osiągnięcia i tabele wyników (wymagałyby sieci i zgody twórcy).

## Specyfikacje w toku

Brak plików w `docs/specs/`.
