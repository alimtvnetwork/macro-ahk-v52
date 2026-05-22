/**
 * Recorder logger shim — neutral logger for recorder UI components.
 *
 * Recorder components run inside the Options page React tree (not a
 * MAIN-world content script), so the `RiseupAsiaMacroExt` namespace
 * logger is not available. This shim mirrors `popup-logger` /
 * `options-logger` so every catch block can call `logError(...)`
 * instead of silently swallowing per `mem://standards/no-error-swallowing`.
 *
 * NEVER call `console.error` directly from recorder components.
 */

const SCOPE_PREFIX = "Recorder.";

export function logError(scope: string, message: string, caught?: unknown): void {
    const fullScope = `${SCOPE_PREFIX}${scope}`;
    if (caught !== undefined) {
        console.error(`[${fullScope}] ${message}`, caught);
    } else {
        console.error(`[${fullScope}] ${message}`);
    }
}
