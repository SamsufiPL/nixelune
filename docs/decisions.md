# Rejestr decyzji

Każda decyzja ma numer, treść, powód, autora (twórca / agent) i status. Wpisów nie
usuwamy: decyzję zmienia nowy wpis, a stary dostaje status „zastąpiona przez D-xx”.

## Przegląd

| Nr | Decyzja | Kto | Status |
|---|---|---|---|
| D-01 | Stos: TypeScript + Vite + Canvas 2D + Capacitor | agent (wymagania twórcy) | obowiązuje |
| D-02 | Języki PL + EN, język zapasowy EN | twórca | obowiązuje |
| D-03 | Repozytorium na razie publiczne; push i CI dozwolone | twórca | obowiązuje, do rewizji |
| D-04 | Bez ESLint; lintem są ścisłe flagi `tsc` | agent | obowiązuje |
| D-05 | Zasady rozgrywki pierwszej wersji | agent (z GDD) | obowiązuje, do sprawdzenia w testach z graczami |
| D-06 | Dźwięk syntezowany w kodzie, bez plików próbek | agent | obowiązuje |
| D-07 | Font Inter dołączony przez `@fontsource-variable/inter` (OFL) | agent | obowiązuje |
| D-08 | Identyfikator aplikacji: tymczasowo `com.nixelune.game` | — | **otwarta (twórca)** |
| D-09 | Nazwa NIXELUNE jest robocza | — | **otwarta (twórca)** |
| D-10 | Szczegóły rozgrywki: kształty, etapy, cele, wyzwania | agent | obowiązuje, do sprawdzenia w testach z graczami |
| D-11 | Poziom trudności: jednokolorowe elementy czy mieszane | — | **otwarta (twórca)** |
| D-12 | Znaki na polach domyślnie włączone | agent | obowiązuje |
| D-13 | Odstępstwa interfejsu od makiet | agent | obowiązuje, do oceny przez twórcę |

## Wpisy

### D-01 Stos technologiczny

- **Co:** TypeScript (strict) + Vite, plansza na Canvas 2D (tylko wektor), HUD i ekrany
  w semantycznym HTML + CSS, powłoka Android / iOS przez Capacitor. Bez silnika gier
  i bez frameworka UI.
- **Dlaczego:** twórca poprosił o Androida w pierwszej kolejności, później iOS, oraz
  o rozwiązanie „najlepsze, zoptymalizowane i lekkie”. Ten stos daje mały pakiet, szybkie
  iteracje w przeglądarce, dostępność przez HTML i jeden kod na obie platformy.
- **Odrzucone:** Godot, Phaser, Flutter / Flame, Defold, natywny Kotlin. Uzasadnienie:
  `docs/research/2026-11-19-technologia.md`.
- **Kto:** agent wybrał, na podstawie wymagań twórcy. **Data:** 2026-11-19.
- **Status:** obowiązuje.

### D-02 Języki

- **Co:** gra w języku polskim i angielskim; nieznany język systemu → angielski.
- **Dlaczego:** decyzja twórcy.
- **Kto:** twórca. **Status:** obowiązuje.

### D-03 Repozytorium publiczne, push i CI dozwolone

- **Co:** repozytorium jest na razie publiczne; agent może wypychać zmiany i korzystać
  z CI, dopóki repozytorium jest publiczne, a runnery są darmowe.
- **Dlaczego:** decyzja twórcy z 2026-11-19 (darmowe minuty CI dla repozytoriów publicznych).
- **Uwaga:** to jest sprzeczne ze stałą zasadą „repozytorium gry jest zawsze prywatne”.
  Decyzję trzeba ponownie rozpatrzyć, **zanim** w repozytorium pojawią się identyfikatory
  sklepowe, materiał do podpisywania, pliki wydań lub `mapping.txt`. Do tego czasu w
  repozytorium nie ma niczego z tej listy, a workflow wydania nie istnieje.
- **Kto:** twórca. **Status:** obowiązuje, do rewizji przed pierwszym wydaniem.

### D-04 Bez ESLint

- **Co:** projekt nie ma ESLint; rolę lintu pełnią ścisłe flagi `tsc`
  (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess` i inne).
- **Dlaczego:** `typescript-eslint` nie obsługuje jeszcze TypeScript 7.
- **Kto:** agent. **Status:** obowiązuje; wrócić do tematu, gdy pojawi się wsparcie.

### D-05 Zasady rozgrywki pierwszej wersji

- **Co:** siatka heksów 9 × 15 z wierzchołkiem u góry (pointy-top); klocki z 3–4 heksów
  w jednym kolorze; po zablokowaniu klocka płytki opadają pojedynczo; grupa 5 lub więcej
  płytek tego samego koloru aktywuje się i znika; punktacja według GDD; tryb bez końca
  z etapami i celami oraz 12 wyzwań o stałym ziarnie losowości.
- **Dlaczego:** wynika z GDD z pakietu (`docs/brand-kit/05_game_design/GDD_PL.md`).
- **Kto:** agent, na podstawie GDD. **Status:** obowiązuje; do potwierdzenia w testach z graczami.

### D-06 Dźwięk syntezowany w kodzie

- **Co:** dźwięki powstają w kodzie (Web Audio), bez plików próbek.
- **Dlaczego:** mały pakiet, brak praw do rozliczania, łatwe strojenie.
- **Kto:** agent. **Status:** obowiązuje.

### D-07 Font Inter

- **Co:** font Inter dołączony do gry przez pakiet `@fontsource-variable/inter`.
- **Dlaczego:** typografia z pakietu; licencja SIL OFL 1.1 pozwala na dołączenie; gra nie
  pobiera niczego z sieci.
- **Kto:** agent. **Status:** obowiązuje.

### D-08 Identyfikator aplikacji (otwarta)

- **Co:** w projekcie jest tymczasowy identyfikator `com.nixelune.game`
  (`capacitor.config.ts`, `android/app/build.gradle`). Propozycja `uk.popolsku.nixelune`
  **nie została zatwierdzona**.
- **Dlaczego to ważne:** identyfikatora nie da się zmienić po pierwszej publikacji
  w Google Play; powinien należeć do domeny, którą twórca kontroluje, i zależy od
  ostatecznej nazwy (D-09).
- **Do decyzji twórcy:** ostateczny identyfikator (ten sam dla Androida i iOS).
- **Status:** otwarta.

### D-09 Nazwa NIXELUNE (otwarta)

- **Co:** NIXELUNE to nazwa robocza; dostępność prawna nie jest potwierdzona.
- **Stan wiedzy:** wstępne sprawdzenie w `docs/research/2026-11-19-nazwa.md` — nie jest
  to opinia prawna.
- **Do decyzji twórcy:** potwierdzenie nazwy (ewentualnie po konsultacji z prawnikiem),
  rejestracja domeny i kont.
- **Status:** otwarta.

### D-10 Szczegóły rozgrywki

- **Co:** 9 kształtów rodzimych dla heksów (trójkąt, linia 3, łuk, śmigło, półksiężyc,
  fala, romb, hak, zakrzywienie), bez sylwetek tetromino. Kształty i kolory losowane
  z worków (bez serii). Opóźnienie blokady 500 ms, okno aktywacji 250 ms. Etapy: cele
  w kolejności ścieżki → pola → punkty → łańcuch, rosnące co rundę; grawitacja
  800 ms × 0,92^(etap−1), minimum 150 ms; premia za etap 600 × numer etapu.
  12 wyzwań `c01`–`c12` ze stałymi ziarnami i limitem elementów. Wszystkie stałe są
  w `src/game/tuning.ts`.
- **Dlaczego:** GDD zostawia te parametry do zbalansowania; wartości dobrano botami
  (`tools/`), a każde wyzwanie ma dowód wygrywalności w `tests/tools/solver.test.ts`.
- **Kto:** agent. **Status:** obowiązuje, do sprawdzenia w testach z graczami.

### D-11 Poziom trudności (otwarta)

- **Stan wiedzy:** przy jednokolorowych elementach i progu 5 dwa stykające się elementy
  tego samego koloru już tworzą ścieżkę. Bot układający losowo przegrywa dopiero po
  medianie 83 elementów, bot zachłanny nie przegrywa wcale; trudność bierze się prawie
  tylko z tempa.
- **Do decyzji twórcy:** zostawić (spokojna gra), dodać elementy mieszane kolorystycznie
  od wyższych etapów (model to obsługuje) albo podnieść próg aktywacji.
- **Status:** otwarta.

### D-12 Znaki na polach

- **Co:** każdy kolor ma wygrawerowany znak (pierścień, trójkąt, dwie kreski, romb,
  krzyżyk), domyślnie włączony; można go wyłączyć w ustawieniach.
- **Dlaczego:** stała zasada „nigdy sam kolor”. Makiety pokazują pola bez znaków, więc
  to odstępstwo od wizualizacji.
- **Kto:** agent. **Status:** obowiązuje.

### D-13 Odstępstwa interfejsu od makiet

- **Co:** przycisk „Zamień” (wg mikrocopy, nie „Zamiana” z makiety); na telefonie
  podgląd następnego układu jest w wierszu statystyk, a zachowany element w przycisku
  „Zamień”; pominięto wypełniacze „THE LUMINOUS PUZZLE” i „THE CONDUIT” oraz poświatę
  księżyca i linie morza z tła; ikony to własne rysunki liniowe.
- **Dlaczego:** mikrocopy ma pierwszeństwo przed tekstami makiet; makieta mobilna nie
  przewiduje podglądów; tło ma nie konkurować z planszą.
- **Kto:** agent. **Status:** obowiązuje, do oceny przez twórcę.

<!-- Kolejne wpisy: D-14, D-15, ... Dodaj wiersz w tabeli przeglądu i sekcję poniżej. -->
