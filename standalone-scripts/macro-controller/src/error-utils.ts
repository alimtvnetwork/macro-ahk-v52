/**
 * MacroController — Error & Logging Utilities
 *
 * Centralizes error message extraction and structured logging wrappers.
 * Each helper delegates to RiseupAsiaMacroExt.Logger when the SDK namespace
 * is available, falling back to direct console output with the same prefix.
 *
 * Available helpers:
 * - `logError(scope, message, error?)` — Hard errors → Logger.error()
 * - `logDebug(scope, message)` — Low-priority diagnostics → Logger.debug()
 * - `logConsole(scope, message, ...args)` — General output → Logger.console()
 * - `logStackTrace(scope, message, error?)` — Always captures stack → Logger.stackTrace()
 *
 * @see spec/21-app/02-features/macro-controller/ts-migration-v2/08-error-logging-and-type-safety.md
 */

/**
 * Extract a human-readable message from any caught value.
 * Handles Error instances, strings, and arbitrary objects.
 */
export function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e !== null && e !== undefined) return String(e);
  return 'Unknown error';
}

/** Try to get the SDK namespace logger, returns undefined if unavailable. */
function getLogger(): RiseupAsiaMacroExtNamespace['Logger'] | undefined {
  try {
    return window.RiseupAsiaMacroExt?.Logger;
  } catch {
    return undefined;
  }
}

/** Build the standard log prefix. */
function prefix(scope: string): string {
  return '[RiseupAsia] [' + scope + '] ';
}

/**
 * Structured error logging — delegates to RiseupAsiaMacroExt.Logger.error().
 *
 * @param scope - Function or module name for context
 * @param message - Human-readable error description
 * @param error - Optional caught error value (stack trace extracted if Error)
 */
export function logError(scope: string, message: string, error?: unknown): void {
  const logger = getLogger();
  if (logger) { logger.error(scope, message, error); return; }
  const base = prefix(scope) + message;
  if (error !== undefined) { console.error(base, error); } else { console.error(base); }
}

/**
 * Structured debug logging — delegates to RiseupAsiaMacroExt.Logger.debug().
 * Use for low-priority diagnostics, intentional fallbacks, and verbose tracing.
 *
 * @param scope - Function or module name for context
 * @param message - Human-readable debug message
 */
export function logDebug(scope: string, message: string): void {
  const logger = getLogger();
  if (logger) { logger.debug(scope, message); return; }
  console.debug(prefix(scope) + message);
}

/**
 * Structured warn logging — delegates to RiseupAsiaMacroExt.Logger.warn().
 * Use for recoverable fallbacks where the system continues but something unexpected happened.
 *
 * @param scope - Function or module name for context
 * @param message - Human-readable warning message
 */
export function logWarn(scope: string, message: string): void {
  const logger = getLogger();
  if (logger) { logger.warn(scope, message); return; }
  console.warn(prefix(scope) + message);
}

/**
 * General-purpose structured console output — delegates to RiseupAsiaMacroExt.Logger.console().
 * Use for runtime observations, data dumps, or verbose tracing.
 *
 * @param scope - Function or module name for context
 * @param message - Human-readable message
 * @param args - Additional values to log (objects, arrays, etc.)
 */
export function logConsole(scope: string, message: string, ...args: unknown[]): void {
  const logger = getLogger();
  if (logger) { logger.console(scope, message, ...(args as Parameters<typeof logger.console>[2][])); return; }
  const base = prefix(scope) + message;
  if (args.length > 0) { console.log(base, ...args); } else { console.log(base); }
}

/**
 * Stack trace logging — delegates to RiseupAsiaMacroExt.Logger.stackTrace().
 * Always captures a full call stack, even when no Error is provided.
 * Use for tracing execution flow, diagnosing call chains, or debugging.
 *
 * @param scope - Function or module name for context
 * @param message - Human-readable message
 * @param error - Optional error; its stack is used if provided, otherwise a fresh stack is captured
 */
export function logStackTrace(scope: string, message: string, error?: unknown): void {
  const logger = getLogger();
  if (logger) { logger.stackTrace(scope, message, error); return; }
  const base = prefix(scope) + message;
  const stack = (error instanceof Error && error.stack) ? error.stack : new Error().stack || '';
  console.error(base + '\n' + stack);
}
