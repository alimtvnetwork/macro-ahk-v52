/**
 * Options-page logger shim.
 *
 * The Options page runs in the extension's own UI context (chrome-extension://
 * options.html) and does NOT receive the `RiseupAsiaMacroExt` MAIN-world SDK,
 * so the namespace logger is never present here. This shim:
 *
 *   1. Mirrors the project-wide rule "no bare console.error" (memory
 *      `error-logging-via-namespace-logger`) by routing every Options error
 *      through a single helper.
 *   2. Forwards the entry to the background Errors DB via `LOG_ERROR` so it
 *      shows up in the global Error Drawer / Activity Log Timeline.
 *   3. Falls back to `console.error` so the entry is never lost when the
 *      background message channel is unavailable (e.g. preview / dev server).
 *
 * NEVER call `console.error` directly from Options components/views.
 */

import { sendMessage } from "@/lib/message-client";
import { MessageType, type MessageRequest } from "@/shared/messages";

const SCOPE_PREFIX = "Options.";

function safeStack(caught: unknown): string | undefined {
    if (caught instanceof Error && typeof caught.stack === "string") {
        return caught.stack;
    }
    return undefined;
}

function safeMessage(caught: unknown): string {
    if (caught instanceof Error) { return caught.message; }
    if (typeof caught === "string") { return caught; }
    if (caught === undefined || caught === null) { return ""; }
    try { return JSON.stringify(caught); } catch { return String(caught); }
}

/**
 * Logs an error scoped to the Options page. `message` should follow the
 * project's CODE-RED convention (exact path, what was missing, reason).
 *
 * Forwards to the background Errors DB so the entry surfaces in the Error
 * Drawer / Activity Log Timeline.
 */
export function logError(scope: string, message: string, caught?: unknown): void {
    const fullScope = `${SCOPE_PREFIX}${scope}`;

    /* Always log to console first so the dev tools surface preserves stack. */
    if (caught !== undefined) {
        console.error(`[${fullScope}] ${message}`, caught);
    } else {
        console.error(`[${fullScope}] ${message}`);
    }

    /* Fire-and-forget forward to background Errors DB. Must never throw. */
    try {
        const detail = caught !== undefined ? safeMessage(caught) : "";
        const composed = detail.length > 0 ? `${message} — ${detail}` : message;
        void sendMessage({
            type: MessageType.LOG_ERROR,
            level: "ERROR",
            source: "options",
            category: fullScope.toUpperCase(),
            errorCode: scope.toUpperCase().replace(/[^A-Z0-9_]+/g, "_"),
            message: composed,
            stackTrace: safeStack(caught),
        } as MessageRequest).catch(() => {
            /* Background not reachable (preview / SW asleep) — already on console. */
        });
    } catch {
        /* sendMessage threw synchronously — already on console. */
    }
}
