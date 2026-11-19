# NIXELUNE — przekazanie do produkcji

## Priorytety

### P0 — ustal przed kodowaniem

- [ ] Potwierdź nazwę (BOIP / EUIPO / TMview / domeny / marketplace); obecna jest robocza.
- [ ] Sprawdź potencjalne podobieństwo mechaniki, oprawy i nazwy do innych gier z prawnikiem IP.
- [ ] Zatwierdź reguły sąsiedztwa, rotacji, grawitacji i progu aktywacji.
- [ ] Test „czytelność w 1 sekundę” na urządzeniu z ekranem 360 px.
- [ ] Ogranicz i udokumentuj motion design.

### P1 — MVP

- [ ] Silnik niezależny od renderowania (czysta siatka i algorytmy).
- [ ] State machine: menu → gra → pauza → wyniki.
- [ ] Touch/keyboard input, holding, rotation, ghost projection.
- [ ] Detekcja połączeń heksagonalnych, kaskady, wynik i game over.
- [ ] Głośność, motion reduction, feedback bez kolorów.
- [ ] Własne ikony, atlas płytek lub renderowanie wektorowe.
- [ ] Dostosowanie na 16:9, 19.5:9, tablet i desktop.

### P2 — publikacja

- [ ] Beta test z 10–15 użytkownikami różnymi wiekowo.
- [ ] Zrzuty ekranu z realnego buildu (nie używać makiet jako screenshotów rozgrywki w sklepie).
- [ ] Polityka prywatności, licencje, zasady analityki i reklamy (jeżeli dotyczy).
- [ ] Prawa do dźwięków/grafik; rozliczone użycie narzędzi graficznych i materiałów zewnętrznych.
- [ ] Logo czytelne w 48×48 px, wersja monochromatyczna, test na jasnym tle.
- [ ] Testy wydajności, czytniki ekranu, kontrast, wibracje, kolor-blind test.

## Struktura implementacji (proponowana)

```
src/
  game/board.ts        # logika heksów, kolizje, rotacja, połączenia
  game/scoring.ts      # punkty, łańcuchy, cele etapów
  game/state.ts        # menu / game / pause / end
  ui/hud.ts            # punkty i cele
  ui/input.ts          # klawiatura/touch
  assets/tokens.css    # wspólny design system
  assets/symbol.svg    # brand mark
```

## Materiały archiwalne

Wcześniejsze, ozdobne wizualizacje `Lattice Drop` zostały **wyłączone z paczki produkcyjnej**. Były referencją podczas rozmowy, ale ich bogate pejzaże i przesadny glow nie spełniają kryterium autorskiego, oszczędnego stylu NIXELUNE.

## Stan zasobów

| Obszar | Status |
|---|---|
| Ident wizualny + logo | koncept + wektorowy materiał źródłowy |
| Kolory / typografia / spacing | zdefiniowane |
| Makiety desktop/mobile | wektorowe, możliwe do edycji |
| Demonstrator mechaniki | prosty lokalny prototyp web |
| Dźwięki / mikroanimacje finalne | do produkcji |
| Produkcyjny kod gry / serwer | nie dostarczono |
| Gwarancja praw do nazwy | nie potwierdzono |
