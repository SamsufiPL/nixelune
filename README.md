# NIXELUNE

Spokojna gra logiczna na siatce sześciokątów: opadają mineralne moduły, gracz łączy pięć
lub więcej pól tego samego koloru w świetlną ścieżkę, ścieżka aktywuje się i znika.
Najpierw Android, później iOS; przeglądarka służy do pracy nad grą.

NIXELUNE to nazwa robocza (zobacz `docs/decisions.md`, D-09).

## Wymagania

- Node 22
- do budowania APK: JDK 21 i Android SDK (platforma 36), zmienna `ANDROID_HOME`

## Uruchomienie

```
npm ci
npm run dev
```

## Testy

```
npm run typecheck
npm test
```

## APK debug

```
npm run android:debug
```

Plik powstaje w `android/app/build/outputs/apk/debug/app-debug.apk`.
Identyfikator aplikacji: `pl.samsufi.nixelune`.
Wersje do sklepu buduje wyłącznie CI; lokalny build wydania bez klucza kończy się błędem.

## Wersja w przeglądarce

Po zielonych testach CI publikuje build web na GitHub Pages:
https://samsufipl.github.io/nixelune/ (ostatnio wdrożona gałąź).

## Inne polecenia

- `npm run build` — sprawdzenie typów i paczka web w `dist/`
- `npm run android:sync` — build web i kopia do projektu Android
- `npm run android:icons` — ikony Androida z plików SVG pakietu (wymaga Playwright
  z Chromium na komputerze; wynik jest w repozytorium)

## Dokumenty

- `docs/decisions.md` — rejestr decyzji
- `docs/roadmap.md` — plan prac
- `docs/licences.md` — licencje
- `docs/research/` — wybór technologii, sprawdzenie nazwy
- `docs/brand-kit/` — pakiet identyfikacji i projekt gry od twórcy
- `CLAUDE.md` — zasady dla agentów
