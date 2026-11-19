/** Where adapter failures go. Services log and carry on; they never throw into the game. */
export type Logger = (scope: string, message: string, error?: unknown) => void;

export const consoleLogger: Logger = (scope, message, error) => {
  if (error === undefined) console.warn(`[${scope}] ${message}`);
  else console.warn(`[${scope}] ${message}`, error);
};

export const silentLogger: Logger = () => {};
