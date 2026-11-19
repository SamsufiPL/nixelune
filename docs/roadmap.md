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
- CI: typy, testy, build web, APK debug jako artefakt na 2 dni.
- Dependabot (npm, Gradle, GitHub Actions) z 7-dniowym opóźnieniem.
- Rozeznanie: technologia i nazwa (`docs/research/`).

## W toku

- Rdzeń gry (`src/game`), interfejs (`src/ui`, `src/render`), usługi (`src/services`).

## Następne, w kolejności

1. Pierwsza grywalna wersja na telefonie twórcy: sprawdzić start bez dostępu do sieci,
   bezpieczne marginesy (wycięcie, paski systemowe), obrót, wibracje, czytnik ekranu.
2. Pomiar płynności na słabym telefonie z Androidem (ryzyko WebView z D-01).
3. Decyzje twórcy: nazwa (D-09), identyfikator aplikacji (D-08), widoczność repozytorium
   przed wydaniem (D-03).
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

- Brak workflow wydania i podpisywania — celowo, do czasu D-03 / D-08 / D-09.
- Powłoka Android nie była uruchomiona na urządzeniu ani emulatorze (tylko build).
- Brak uprawnienia INTERNET opiera się na tym, że Capacitor serwuje pliki z pakietu
  przez przechwytywanie żądań; potwierdzić na urządzeniu.
- Reguły kopii zapasowej zakładają domyślną grupę wtyczki Preferences
  (`CapacitorStorage`); zmiana grupy w `src/services` wymaga zmiany w
  `android/app/src/main/res/xml/`.
- Ikona adaptacyjna ma jednolite tło; pierścień „księżyca” z ikony w pakiecie jest tylko
  w ikonach starszego typu. Do oceny przez twórcę na telefonie.
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
