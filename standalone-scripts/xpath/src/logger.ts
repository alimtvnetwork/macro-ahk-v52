/**
 * XPath Utilities — Internal logger
 * Decoupled so core modules can log without circular imports.
 */

type LogFunction = (scopeLabel: string, message: string) => void;

let _log: LogFunction = () => {};
let _logSub: LogFunction = () => {};
let _warn: LogFunction = () => {};

export function setLogger(log: LogFunction, logSub: LogFunction, warn: LogFunction): void {
  _log = log;
  _logSub = logSub;
  _warn = warn;
}

export function getLogger() {
  return { log: _log, logSub: _logSub, warn: _warn };
}
