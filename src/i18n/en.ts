import type { Message } from '../platform/types';

/** English catalogue. Same keys as pl.ts; written as English, not translated word for word. */
export const messages: Record<string, Message> = {
  // Menu
  'menu.promise.lead': 'Connect the light.',
  'menu.promise.rest': 'Shift the pattern.',
  'menu.play': 'Play',
  'menu.challenges': 'Challenges',
  'menu.settings': 'Settings',
  'menu.best': 'Best score',

  // HUD
  'hud.score': 'Score',
  'hud.stage': 'Stage',
  'hud.chain': 'Chain',
  'hud.pieces': 'Pieces',
  'hud.goal': 'Stage goal',
  'hud.goal.challenge': 'Challenge goal',
  'hud.next': 'Up next',
  'hud.next.short': 'Next',
  'hud.held': 'Held',
  'hud.held.none': 'Empty',
  'hud.controls': 'Controls',

  // Actions
  'action.move': 'Move',
  'action.rotate': 'Rotate',
  'action.drop': 'Drop',
  'action.swap': 'Swap',
  'action.pause': 'Pause',
  'key.space': 'Space',

  // Goals
  'goal.paths': {
    one: 'Light {count} path',
    other: 'Light {count} paths',
  },
  'goal.chain': 'Build a ×{count} chain',
  'goal.tiles': {
    one: 'Clear {count} tile',
    other: 'Clear {count} tiles',
  },
  'goal.score': {
    one: 'Score {value} point',
    other: 'Score {value} points',
  },
  'goal.progress': '{done} / {target}',

  // Stage complete
  'stage.title': 'Path complete',
  'stage.subtitle': 'Stage {stage} cleared',
  'stage.bonus': {
    one: '+{value} point',
    other: '+{value} points',
  },
  'stage.continue': 'Continue',

  // Results
  'over.title': 'Lights out',
  'over.won.title': 'Challenge complete',
  'over.failed.title': 'Out of pieces',
  'over.score': 'Score',
  'over.best': 'Best score',
  'over.newBest': 'New best score',
  'over.stage': 'Stage {stage}',
  'over.retry': 'Try again',
  'over.menu': 'Menu',
  'over.challenges': 'Challenges',

  // Pause
  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.restart': 'Start over',
  'pause.settings': 'Settings',
  'pause.menu': 'Quit to menu',

  // First-run hints
  'tutorial.join': 'Join 5 tiles of the same color.',
  'tutorial.rotate': 'Rotate the piece to build a path.',

  // Challenges
  'challenges.title': 'Challenges',
  'challenges.item': 'Challenge {number}',
  'challenges.pieces': {
    one: '{count} piece',
    other: '{count} pieces',
  },
  'challenges.completed': 'Completed',
  'challenges.best': 'Best score: {value}',
  'challenges.empty': 'Challenges arrive in a later version.',

  // Settings
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.language.system': 'System',
  'settings.language.pl': 'Polski',
  'settings.language.en': 'English',
  'settings.sound': 'Sound volume',
  'settings.sound.value': '{percent}%',
  'settings.haptics': 'Vibration',
  'settings.motion': 'Reduced motion',
  'settings.motion.help': 'Changes on the board appear at once, without animation.',
  'settings.motion.system': 'System',
  'settings.motion.on': 'On',
  'settings.motion.off': 'Off',
  'settings.marks': 'Tile marks',
  'settings.marks.help': 'Each color carries its own mark, so tiles differ by more than color.',
  'settings.contrast': 'High contrast',
  'settings.contrast.help': 'Stronger tile outlines and bolder marks.',
  'settings.look': 'Look',
  'settings.look.help': 'A temporary choice while candidate looks are judged.',
  'settings.about': 'Licences and about',

  // About
  'about.title': 'About',
  'about.version': 'Version {version}',
  'about.body': 'A calm puzzle game on a board of hexagons. No ads, no tracking, no network connection.',
  'about.licences': 'Licences',
  'about.licences.intro': 'The game uses the following libraries and resources:',

  'common.back': 'Back',

  // Screen reader
  'a11y.board': 'Game board',
  'a11y.describe': 'Describe the board',
  'a11y.activated': {
    one: 'Path lit. +{value} point.',
    other: 'Path lit. +{value} points.',
  },
  'a11y.chain': {
    one: 'Chain ×{length}. +{value} point.',
    other: 'Chain ×{length}. +{value} points.',
  },
  'a11y.over': 'Game over. Score: {value}.',
  'a11y.paused': 'Game paused.',
  'a11y.summary.status': 'Score {score}. Stage {stage}. Goal: {goal}, {progress}.',
  'a11y.summary.board': {
    one: '{count} tile on the board, reaching row {top} of {rows}.',
    other: '{count} tiles on the board, reaching row {top} of {rows}.',
  },
  'a11y.summary.empty': 'The board is empty.',
  'a11y.summary.active': 'Falling piece: {color}, columns {from} to {to}, row {row}.',
  'a11y.summary.next': 'Next: {color}.',
  'a11y.summary.held': 'Held: {color}.',
  'a11y.summary.held.none': 'Nothing held.',
  'color.teal': 'teal',
  'color.coral': 'coral',
  'color.ice': 'ice blue',
  'color.lilac': 'lilac',
  'color.amber': 'amber',
  'color.withMark': '{color}, mark: {mark}',
};
