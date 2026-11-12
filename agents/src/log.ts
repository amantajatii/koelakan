/** Minimal logger interface; only the CLI module binds it to the console. */
export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
}

export const silentLogger: Logger = { info: () => undefined, warn: () => undefined };

export const consoleLogger: Logger = {
  info: (m) => process.stdout.write(`${m}\n`),
  warn: (m) => process.stderr.write(`${m}\n`),
};

export const clock = (d: Date = new Date()): string => d.toISOString().slice(11, 19);
