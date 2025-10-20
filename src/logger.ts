export interface Logger {
  info(...meta: any[]): void;
  warn(...meta: any[]): void;
  error(...meta: any[]): void;
  debug(...meta: any[]): void;
}

export const defaultLogger: Logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};
