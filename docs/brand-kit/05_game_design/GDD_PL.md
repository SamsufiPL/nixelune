# NIXELUNE — Game Design Document (GDD)

**Status: koncepcja mechaniki / hipotezy testowe, nie ostateczna specyfikacja gry.**

## 1. Pitch

Spokojna, ale zręcznościowa gra logiczna. Z góry napływają skupiska mineralnych sześciokątów. Gracz przesuwa, obraca i układa moduły, aby tworzyć **ścieżki połączonych elementów tej samej barwy**. Ścieżka od pięciu pól zostaje aktywowana i znika, uwalniając miejsce. Tempo rośnie; wynik zależy od planowania, ciągłości ruchów i kombo.

**Nie:** prostokątna plansza, klasyczne siedem kształtów tetromino, czyszczenie pełnych poziomych linii, estetyka neonowego arcade.

## 2. Koncept zasad — pierwszy prototyp

- Plansza ma **9 kolumn × 15 wierszy**, heksagonalną siatkę z przesunięciem co drugi wiersz. Parametry do zbalansowania w playtestach.
- Spadające skupiska składają się z **3 lub 4 połączonych sześciokątów**. Wersja docelowa dopuszcza układy specjalne oraz mieszane kolory, ale MVP używa jednego koloru na element.
- Sterowanie: przesuwanie w lewo/prawo, obrót o 60°, przyspieszone opuszczenie oraz zamiana z odłożonym modułem.
- Po ustabilizowaniu skupiska wykryj sąsiadujące heksy w tym samym kolorze.
- **Pięć lub więcej** sąsiadujących heksów aktywuje sieć (grupa connected components), daje punkty i usuwa segment.
- Po usunięciu modułów pozostałe opadają zgodnie z pionową grawitacją; kolejne aktywacje tworzą łańcuch.
- Brak miejsca na nowy moduł oznacza koniec rozgrywki.
- Cele etapów są dodatkowe: np. „Połącz 3 ścieżki”, „Utwórz kombo ×3”, „Przetrwaj 4 minuty”.

### Punktacja (robocza)

Aktywacja: 100 punktów za każdy heks powyżej progu 4, bonus 60 punktów za każde pole w ścieżce oraz mnożnik 1 + 0,5 za każdy kolejny łańcuch. Wersja prototypowa może mieć uproszczony algorytm punktacji.

### Dlaczego to nie jest Tetris

Podobieństwo kategorii polega na **modułach napływających z góry**. Zasadnicza różnica to plansza heksagonalna, rotacja o 60°, wyszukiwanie wielokierunkowych sąsiedztw, aktywowanie grup/ścieżek zamiast czyszczenia rzędów oraz własna prezentacja stanów. Niezależna analiza prawna projektu jest nadal wskazana przed komercyjnym wdrożeniem.

## 3. Core loop

1. Rozpoznaj kolor i kształt nadchodzącego modułu.
2. Przewidź miejsce lądowania (ghost indicator).
3. Przesuń/obróć/zamień i upuść element.
4. Połącz ≥5 pól jednego koloru.
5. Obejrzyj krótki impuls światła, uzyskaj wynik i wolną przestrzeń.
6. Rozpocznij kolejny ruch, aż do końca etapu lub blokady planszy.

## 4. Ekrany

- **Menu główne:** logo, jednozdaniowa obietnica, GRAJ, WYZWANIA, USTAWIENIA.
- **Rozgrywka mobile:** plansza dominuje, góra: wynik/etap/łańcuch, dół: cel i podstawowe akcje.
- **Rozgrywka desktop:** boczne sekcje informacji, centralna plansza; nie kopiować 1:1 układu makiety do mobile.
- **Wynik:** prosty panel ze stanem „Ścieżka domknięta”, punktami i jednym CTA.
- **Pauza/ustawienia:** dźwięk, wibracje, kontrast i paleta dla daltonizmu, sterowanie.

## 5. Feedback i audio

- Przesunięcie: dyskretny tick, zero drżenia kamery.
- Rotacja: 160 ms; mały impuls obrysu jednego skupiska.
- Upuszczenie: 80 ms „przyciągnięcia”, przy lądowaniu krótki matowy dźwięk.
- Połączenie: 240 ms sekwencyjnego przepływu energii po ścieżce; wyraźna zmiana stanu także bez koloru.
- Streak: progresywna modulacja dźwięku, nigdy narastający ciągle neon.
- Reducowana animacja: natychmiastowe zmiany bez impulsów, respektowanie `prefers-reduced-motion`.

## 6. Poziomy i retencja (do zweryfikowania)

- Endless: rosnące tempo i porównywanie wyniku; brak sztucznego „pay to win”.
- Poziomy: krótkie cele, zmienne zestawy startowe, własne zadania, nie tylko rosnący licznik.
- Daily challenge: deterministyczne seedowane układy, jeśli dodamy backend.
- Brak zaprojektowanych lootboxów, przypadkowej monetyzacji i interfejsowych pułapek.

## 7. Założenia technologiczne

MVP browser: Canvas 2D + JS, tryb mobile/desktop. Produkcyjnie: np. Phaser z assetami wektorowymi/atlasami tekstur lub Unity/Godot; decyzję podjąć po profilowaniu. Projekt powinien trzymać logikę planszy niezależnie od warstwy renderingu.

## 8. Lista testów rozgrywki

- Czy użytkownik rozumie próg pięciu pól bez tutorialu?
- Czy rozróżnia kolor pól w słabym świetle?
- Czy potrafi wygodnie zmienić pozycję skupiska jedną ręką?
- Czy widzi miejsce lądowania pod palcem?
- Czy rozumie różnicę między ścieżką i zwykłym kontaktem pól?
- Czy gra wygląda jak własny produkt obok innych gier logicznych, także przy ikonie 48 px?
