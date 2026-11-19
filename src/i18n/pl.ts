import type { Message } from '../platform/types';

/**
 * Polish catalogue. Texts defined in docs/brand-kit/05_game_design/MIKROCOPY_PL.md are
 * used verbatim. Counted nouns carry all four Polish plural forms.
 */
export const messages: Record<string, Message> = {
  // Menu
  'menu.promise.lead': 'Połącz światło.',
  'menu.promise.rest': 'Zmień układ.',
  'menu.play': 'Graj',
  'menu.challenges': 'Wyzwania',
  'menu.settings': 'Ustawienia',
  'menu.best': 'Najlepszy wynik',

  // HUD
  'hud.score': 'Wynik',
  'hud.stage': 'Etap',
  'hud.chain': 'Łańcuch',
  'hud.pieces': 'Elementy',
  'hud.goal': 'Cel etapu',
  'hud.goal.challenge': 'Cel wyzwania',
  'hud.next': 'Następny układ',
  'hud.next.short': 'Następny',
  'hud.held': 'Zachowany',
  'hud.held.none': 'Brak',
  'hud.controls': 'Sterowanie',

  // Actions
  'action.move': 'Przesuń',
  'action.rotate': 'Obróć',
  'action.drop': 'Upuść',
  'action.swap': 'Zamień',
  'action.pause': 'Pauza',
  'key.space': 'Spacja',

  // Goals
  'goal.paths': {
    one: 'Połącz {count} świetlną ścieżkę',
    few: 'Połącz {count} świetlne ścieżki',
    many: 'Połącz {count} świetlnych ścieżek',
    other: 'Połącz {count} świetlnej ścieżki',
  },
  'goal.chain': 'Utwórz łańcuch ×{count}',
  'goal.tiles': {
    one: 'Usuń {count} pole',
    few: 'Usuń {count} pola',
    many: 'Usuń {count} pól',
    other: 'Usuń {count} pola',
  },
  'goal.score': {
    one: 'Zdobądź {value} punkt',
    few: 'Zdobądź {value} punkty',
    many: 'Zdobądź {value} punktów',
    other: 'Zdobądź {value} punktu',
  },
  'goal.progress': '{done} / {target}',

  // Stage complete
  'stage.title': 'Ścieżka domknięta',
  'stage.subtitle': 'Etap {stage} ukończony',
  'stage.bonus': {
    one: '+{value} punkt',
    few: '+{value} punkty',
    many: '+{value} punktów',
    other: '+{value} punktu',
  },
  'stage.continue': 'Dalej',

  // Results
  'over.title': 'Sieć wygasła',
  'over.won.title': 'Wyzwanie ukończone',
  'over.failed.title': 'Zabrakło elementów',
  'over.score': 'Wynik',
  'over.best': 'Najlepszy wynik',
  'over.newBest': 'Nowy najlepszy wynik',
  'over.stage': 'Etap {stage}',
  'over.retry': 'Spróbuj ponownie',
  'over.menu': 'Menu',
  'over.challenges': 'Wyzwania',

  // Pause
  'pause.title': 'Pauza',
  'pause.resume': 'Wznów',
  'pause.restart': 'Zacznij od nowa',
  'pause.settings': 'Ustawienia',
  'pause.menu': 'Wyjdź do menu',

  // First-run hints
  'tutorial.join': 'Połącz 5 pól tego samego koloru.',
  'tutorial.rotate': 'Obracaj element, aby utworzyć ścieżkę.',

  // Challenges
  'challenges.title': 'Wyzwania',
  'challenges.item': 'Wyzwanie {number}',
  'challenges.pieces': {
    one: '{count} element',
    few: '{count} elementy',
    many: '{count} elementów',
    other: '{count} elementu',
  },
  'challenges.completed': 'Ukończone',
  'challenges.best': 'Najlepszy wynik: {value}',
  'challenges.empty': 'Wyzwania pojawią się w kolejnej wersji.',

  // Settings
  'settings.title': 'Ustawienia',
  'settings.language': 'Język',
  'settings.language.system': 'Systemowy',
  'settings.language.pl': 'Polski',
  'settings.language.en': 'English',
  'settings.sound': 'Głośność dźwięku',
  'settings.sound.value': '{percent}%',
  'settings.haptics': 'Wibracje',
  'settings.motion': 'Ograniczony ruch',
  'settings.motion.help': 'Zmiany na planszy pojawiają się od razu, bez animacji.',
  'settings.motion.system': 'Systemowy',
  'settings.motion.on': 'Włączony',
  'settings.motion.off': 'Wyłączony',
  'settings.marks': 'Znaki na polach',
  'settings.marks.help': 'Każdy kolor ma własny znak, więc pola rozróżnisz nie tylko po barwie.',
  'settings.contrast': 'Wysoki kontrast',
  'settings.contrast.help': 'Mocniejsze obrysy pól i wyraźniejsze znaki.',
  'settings.about': 'Licencje i informacje',

  // About
  'about.title': 'Informacje',
  'about.version': 'Wersja {version}',
  'about.body': 'Spokojna gra logiczna na planszy z sześciokątów. Bez reklam, bez śledzenia, bez połączenia z siecią.',
  'about.licences': 'Licencje',
  'about.licences.intro': 'Gra korzysta z następujących bibliotek i zasobów:',

  'common.back': 'Wróć',

  // Screen reader
  'a11y.board': 'Plansza gry',
  'a11y.describe': 'Opisz planszę',
  'a11y.activated': {
    one: 'Ścieżka aktywna. +{value} punkt.',
    few: 'Ścieżka aktywna. +{value} punkty.',
    many: 'Ścieżka aktywna. +{value} punktów.',
    other: 'Ścieżka aktywna. +{value} punktu.',
  },
  'a11y.chain': {
    one: 'Łańcuch ×{length}. +{value} punkt.',
    few: 'Łańcuch ×{length}. +{value} punkty.',
    many: 'Łańcuch ×{length}. +{value} punktów.',
    other: 'Łańcuch ×{length}. +{value} punktu.',
  },
  'a11y.over': 'Koniec gry. Wynik: {value}.',
  'a11y.paused': 'Gra wstrzymana.',
  'a11y.summary.status': 'Wynik {score}. Etap {stage}. Cel: {goal}, {progress}.',
  'a11y.summary.board': {
    one: 'Na planszy leży {count} pole, najwyżej w wierszu {top} z {rows}.',
    few: 'Na planszy leżą {count} pola, najwyżej w wierszu {top} z {rows}.',
    many: 'Na planszy leży {count} pól, najwyżej w wierszu {top} z {rows}.',
    other: 'Na planszy leży {count} pola, najwyżej w wierszu {top} z {rows}.',
  },
  'a11y.summary.empty': 'Plansza jest pusta.',
  'a11y.summary.active': 'Spada element: {color}, kolumny od {from} do {to}, wiersz {row}.',
  'a11y.summary.next': 'Następny: {color}.',
  'a11y.summary.held': 'Zachowany: {color}.',
  'a11y.summary.held.none': 'Nic nie zachowano.',
  'color.teal': 'morski, znak: pierścień',
  'color.coral': 'koralowy, znak: trójkąt',
  'color.ice': 'lodowy, znak: dwie kreski',
  'color.lilac': 'liliowy, znak: romb',
  'color.amber': 'bursztynowy, znak: krzyżyk',
};
