# NIXELUNE / ZACZNIJ TUTAJ

**Konceptualny pakiet identyfikacji gry logicznej | v1.0 | 19 listopada 2026**

NIXELUNE to **robocza nazwa** autorskiej gry logicznej o układaniu mineralnych modułów na sześciokątnej siatce i budowaniu świetlnych ścieżek. To nie jest klon Tetrisa: nie wykorzystuje klasycznej prostokątnej planszy ani zasad czyszczenia pełnych poziomych rzędów. Kluczowy cel to **łączenie pól tej samej barwy w obwody o długości co najmniej 5**.

## Najpierw obejrzyj

1. `01_brandbook/NIXELUNE_Brandbook.pdf` - 14-stronicowy przewodnik dla projektanta i dewelopera.
2. `02_visuals/` - cztery makiety ekranów i zestaw komponentów, jako PNG oraz edytowalne SVG.
3. `03_logo/` - logo poziome, pionowe, symbol i ikona aplikacji; warianty edytowalne w SVG.
4. `04_design_system/` - kolory (JSON, CSS), typografia, spacing, zasady komponentów.
5. `05_game_design/` - dokument mechaniki, instrukcja gracza, przebieg gry i różnicowanie produktu.
6. `06_prototype/` - działający demonstrator przeglądarkowy: otwórz `index.html` bez instalacji.
7. `08_handoff/` - lista zadań do wdrożenia, ryzyka i kwestie prawne.

## Ważne rozróżnienie

- **Makiety** są materiałami projektowymi; nie są finalnymi screenami aplikacji ani ilustracjami gwarantującymi finalny wygląd renderingu w silniku.
- **Prototyp** jest demonstratorem logiki i sterowania; nie stanowi gotowej produkcyjnej gry.
- **Znak i nazwa** są propozycjami, **nie mają poświadczonej dostępności prawnej**. Przed premierą sprawdź BOIP/EUIPO/TMview oraz domeny.
- **Kolory, logo, siatka i zasady UI** są zdefiniowane w sposób spójny, ale przed produkcją wymagają testów UX, dostępności i urządzeń docelowych.

## Zasada przewodnia / ZERO AI SLOP

Nie kopiujemy układu Tetrisa. Nie dopuszczamy przypadkowych dekoracji, generowanych ornamentów, wielokolorowych gradientów, imitacji szklanych dashboardów, masowej typografii all-caps ani świecących ramek wokół każdego elementu. Każdy efekt światła musi reprezentować stan gry. Scena ma mieć **więcej ciszy niż efektów**.

## Eksport

- SVG = plik wektorowy edytowalny w Figma, Illustrator, Inkscape.
- PNG = podgląd / szybkie prezentacje; nie jest plikiem źródłowym projektu.
- PPTX = edytowalny brandbook; PDF = wersja do czytania i udostępnienia.
- HTML/CSS/JS = demonstrator rozgrywki oraz przykładowe tokeny wdrożenia.
