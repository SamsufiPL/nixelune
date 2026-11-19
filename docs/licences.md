# Licencje

Stan na 2026-11-19. Lista obejmuje to, co trafia do gry. Każdą nową zależność dopisujemy
tutaj w tej samej zmianie; lista jest źródłem dla ekranu licencji w grze.

## Dołączone do gry (kod web)

| Pakiet | Wersja | Licencja | Źródło informacji |
|---|---|---|---|
| @capacitor/core | 8.6.2 | MIT | `package.json` pakietu |
| @capacitor/app | 8.1.2 | MIT | `package.json` pakietu |
| @capacitor/haptics | 8.0.2 | MIT | `package.json` pakietu |
| @capacitor/preferences | 8.0.1 | MIT | `package.json` pakietu |
| @capacitor/status-bar | 8.0.4 | MIT | `package.json` pakietu |
| @fontsource-variable/inter (font Inter, © The Inter Project Authors) | 5.3.0 | SIL OFL 1.1 | `package.json` i `LICENSE` pakietu |

## Dołączone do aplikacji Android

| Biblioteka | Wersja | Licencja | Źródło informacji |
|---|---|---|---|
| @capacitor/android (Capacitor, kod natywny) i części natywne wtyczek powyżej | 8.6.2 | MIT | `package.json` pakietu |
| Apache Cordova Android (`org.apache.cordova:framework`) | 14.0.1 | Apache 2.0 | plik POM |
| AndroidX: activity 1.11.0, appcompat 1.7.1, core 1.17.0, core-splashscreen 1.2.0, coordinatorlayout 1.3.0, fragment 1.8.9, webkit 1.14.0 oraz ich zależności (lifecycle, emoji2, startup, profileinstaller, savedstate, collection, annotation i inne) | różne | Apache 2.0 | pliki POM (sprawdzone dla głównych modułów) |
| Kotlin stdlib (`org.jetbrains.kotlin:kotlin-stdlib`) | 2.0.21 | Apache 2.0 | plik POM |
| kotlinx.coroutines | 1.8.1 | Apache 2.0 | plik POM |
| JetBrains annotations | 23.0.0 | Apache 2.0 | plik POM |
| JSpecify | 1.0.0 | Apache 2.0 | plik POM |
| Guava ListenableFuture (`com.google.guava:listenablefuture`) | 1.0 | Apache 2.0 | licencja projektu Guava; w POM brak wpisu |

Pełną listę bibliotek Androida pokazuje
`cd android && ./gradlew :app:dependencies --configuration releaseRuntimeClasspath`.

## Materiały własne

Logo, symbol, ikona, kolory i zasady z `docs/brand-kit/` pochodzą od twórcy. Ikony
aplikacji w `android/app/src/main/res/` są wygenerowane z plików SVG z pakietu
(`npm run android:icons`). Dźwięki powstają w kodzie (D-06), bez plików zewnętrznych.

## Narzędzia deweloperskie (nie trafiają do gry)

| Pakiet | Wersja | Licencja |
|---|---|---|
| typescript | 7.0.2 | Apache 2.0 |
| vite | 8.3.8 | MIT |
| vitest | 5.1.1 | MIT |
| jsdom | 31.0.1 | MIT |
| @capacitor/cli | 8.6.2 | MIT |
| Android Gradle Plugin | 8.13.0 | Apache 2.0 |
| Gradle | 8.14.3 | Apache 2.0 |
