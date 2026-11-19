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
| D-07 | Font Inter dołączony przez `@fontsource-variable/inter` (OFL) | agent | do rewizji (D-15) |
| D-08 | Identyfikator aplikacji: `pl.samsufi.nixelune` | twórca | obowiązuje |
| D-09 | Nazwa NIXELUNE jest robocza | — | **otwarta (twórca)** |
| D-10 | Szczegóły rozgrywki: kształty, etapy, cele, wyzwania | agent | obowiązuje, do sprawdzenia w testach z graczami |
| D-11 | Poziom trudności: elementy mieszane od wyższych etapów | twórca | obowiązuje (realizacja: D-14) |
| D-12 | Znaki na polach domyślnie włączone | agent | obowiązuje |
| D-13 | Odstępstwa interfejsu od makiet | agent | do rewizji (D-15) |
| D-14 | Elementy mieszane kolorystycznie od wyższych etapów | twórca | obowiązuje, w realizacji |
| D-15 | Kierunek wizualny z pakietu odrzucony; nowy w wyborze | twórca | obowiązuje; wybór kierunku **otwarty (twórca)** |
| D-16 | Telefony zablokowane w pionie; tablety i rozłożone składane obracają się | twórca | obowiązuje |

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

### D-07 Font Inter (do rewizji)

- **Co:** font Inter dołączony do gry przez pakiet `@fontsource-variable/inter`.
- **Dlaczego:** typografia z pakietu; licencja SIL OFL 1.1 pozwala na dołączenie; gra nie
  pobiera niczego z sieci.
- **Kto:** agent. **Status:** do rewizji — krój pisma zależy od nowego kierunku
  wizualnego (D-15). Do tego czasu Inter zostaje w kodzie.

### D-08 Identyfikator aplikacji

- **Co:** identyfikator aplikacji to `pl.samsufi.nixelune`, ten sam dla Androida i iOS
  (`capacitor.config.ts`, `android/app/build.gradle`, pakiet `MainActivity`).
- **Dlaczego:** decyzja twórcy. Identyfikatora nie da się zmienić po pierwszej publikacji
  w Google Play.
- **Historia:** do decyzji w projekcie był tymczasowy `com.nixelune.game`; propozycja
  `uk.popolsku.nixelune` nie została zatwierdzona.
- **Uwaga:** identyfikator zawiera roboczą nazwę gry (D-09).
- **Kto:** twórca. **Data:** 2026-11-19. **Status:** obowiązuje.

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

### D-11 Poziom trudności

- **Stan wiedzy:** przy jednokolorowych elementach i progu 5 dwa stykające się elementy
  tego samego koloru już tworzą ścieżkę. Bot układający losowo przegrywa dopiero po
  medianie 83 elementów, bot zachłanny nie przegrywa wcale; trudność bierze się prawie
  tylko z tempa.
- **Rozważane:** zostawić (spokojna gra), dodać elementy mieszane kolorystycznie od
  wyższych etapów albo podnieść próg aktywacji.
- **Co:** twórca wybrał elementy mieszane kolorystycznie od wyższych etapów.
  Realizację opisuje D-14.
- **Kto:** twórca. **Data:** 2026-11-19. **Status:** obowiązuje.

### D-12 Znaki na polach

- **Co:** każdy kolor ma wygrawerowany znak (pierścień, trójkąt, dwie kreski, romb,
  krzyżyk), domyślnie włączony; można go wyłączyć w ustawieniach.
- **Dlaczego:** stała zasada „nigdy sam kolor”. Makiety pokazują pola bez znaków, więc
  to odstępstwo od wizualizacji.
- **Kto:** agent. **Status:** obowiązuje.

### D-13 Odstępstwa interfejsu od makiet (do rewizji)

- **Co:** przycisk „Zamień” (wg mikrocopy, nie „Zamiana” z makiety); na telefonie
  podgląd następnego układu jest w wierszu statystyk, a zachowany element w przycisku
  „Zamień”; pominięto wypełniacze „THE LUMINOUS PUZZLE” i „THE CONDUIT” oraz poświatę
  księżyca i linie morza z tła; ikony to własne rysunki liniowe.
- **Dlaczego:** mikrocopy ma pierwszeństwo przed tekstami makiet; makieta mobilna nie
  przewiduje podglądów; tło ma nie konkurować z planszą.
- **Kto:** agent. **Status:** do rewizji — makiety przestały być wzorcem (D-15), więc
  ten wpis trzeba napisać od nowa po wyborze kierunku wizualnego.

### D-14 Elementy mieszane kolorystycznie od wyższych etapów

- **Co:** od wyższych etapów elementy mogą składać się z pól w różnych kolorach.
  Realizacja decyzji D-11.
- **Dlaczego:** przy elementach jednokolorowych trudność bierze się prawie tylko z tempa
  (pomiary botów w D-11).
- **Parametry:** etapy 1–2 jednokolorowe; od etapu 3 udział elementów dwukolorowych
  30%, +15 punktów procentowych na etap, maksymalnie 90% od etapu 7. Element dzieli
  się na dwie spójne części (2+1, 3+1, 2+2). Wyzwania bez zmian (opcjonalne pole
  `mixedShare`). Dodatkowo: po 40 elementach w jednym etapie grawitacja przyspiesza
  o 1,5% na element (do 150 ms), żeby nie dało się przeczekać etapu. Stałe w
  `src/game/tuning.ts`.
- **Wynik pomiarów:** bot losowy — mediana bez zmian (ok. 72–77 elementów), ale długie
  szczęśliwe serie znikają (maksimum 186 zamiast 400). Bot zachłanny nadal nie
  przegrywa; ignoruje on czas, więc nie mierzy presji tempa. Realną presję na uważnego
  gracza dałby dopiero szybszy wzrost tempa albo rzędy rosnące od dołu — do oceny po
  testach z ludźmi.
- **Kto:** twórca zdecydował; realizuje agent rdzenia gry. **Data:** 2026-11-19.
- **Status:** obowiązuje, wdrożone.

### D-15 Kierunek wizualny z pakietu odrzucony

- **Co:** twórca odrzucił kierunek wizualny z pakietu jako „AI slop”. Wymienił: kosmiczne
  tło, pastelową paletę na granacie z mosiądzem, cienkie wersaliki Inter z szerokimi
  odstępami, fazowane sześciokąty i zaokrąglone panele. Nowy kierunek jest wybierany
  spośród trzech propozycji.
- **Skutki do czasu wyboru:**
  - D-07 (Inter) i D-13 (odstępstwa od makiet) mają status „do rewizji”;
  - materiały wizualne w `docs/brand-kit/` (makiety, kolory, typografia, logo, zasady
    stylu) nie są już wytycznymi dla wyglądu gry;
  - teksty projektu gry i mikrocopy z pakietu (`05_game_design/`) nadal obowiązują.
- **Do zmiany po wyborze:** style i rysowanie planszy, ikona aplikacji i ekran startowy
  Androida (dziś generowane z logo pakietu, kolor tła `#0E1522`), sekcja „Art direction”
  w `CLAUDE.md`.
- **Kto:** twórca. **Data:** 2026-11-19.
- **Status:** obowiązuje; wybór nowego kierunku otwarty (twórca).

### D-16 Orientacja ekranu

- **Co:** na telefonach gra działa tylko w pionie; ekrany o najmniejszej szerokości od
  600 dp (tablety, rozłożone telefony składane) obracają się swobodnie. Blokada jest
  flagą zasobów `portrait_only` czytaną w `MainActivity`, nie atrybutem manifestu.
  Wersja w przeglądarce nie blokuje obrotu.
- **Dlaczego:** decyzja twórcy (2026-11-19) — gra na telefonie ma być pionowa.
- **Kto:** twórca. **Status:** obowiązuje.

<!-- Kolejne wpisy: D-17, D-18, ... Dodaj wiersz w tabeli przeglądu i sekcję poniżej. -->
