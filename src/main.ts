/** Entry point: styles, services, then the app shell. */
import './ui/styles/fonts.css';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/components.css';
import './ui/styles/screens.css';
import './ui/styles/game.css';

import { version } from '../package.json';
import { CHALLENGES } from './game/challenges';
import { createGame } from './game/game';
import { createServices } from './services';
import { createApp } from './ui/app';
import { loadLicences } from './ui/licences';

// docs/licences.md is the list of record; the glob is empty (not an error) if it is missing.
const licenceDocs = import.meta.glob<string>('../docs/licences.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

async function start(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) throw new Error('#app is missing from index.html');
  const services = await createServices();
  const app = createApp({
    root,
    services,
    createGame,
    challenges: CHALLENGES,
    licences: loadLicences(licenceDocs),
    version,
  });
  if (import.meta.env.DEV) {
    // Development handle for manual checks and screenshot scripts; not in production builds.
    (window as unknown as { __nx?: unknown }).__nx = { app, services };
  }
}

void start();
