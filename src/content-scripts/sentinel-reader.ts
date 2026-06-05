/**
 * Marco Extension — Page-side sentinel reader
 *
 * Companion to `src/background/url-trigger.ts`. Runs in the page
 * (MAIN world) and exposes a tiny synchronous API so injected scripts
 * can ask "does the extension think this page is allowed?" in O(1)
 * without messaging the background.
 *
 * IMPORTANT — trust model:
 *   The sentinel is a HINT, not the source of truth. A hostile page
 *   could spoof the div with arbitrary `data-projects`. The
 *   background-side `tabDecisionCache` remains authoritative; this
 *   helper is purely for cheap UI gating (show/hide controls, skip
 *   no-op work). NEVER use it to authorize anything privileged.
 */

const SENTINEL_ID = "__marco_sentinel__";
const ATTR_FP = "data-fp";
const ATTR_PROJECTS = "data-projects";
const ATTR_CAN_RUN = "data-can-run";
const ATTR_TRIGGER = "data-trigger";

/** Snapshot of the sentinel's data-* state at read time. */
export interface SentinelSnapshot {
    readonly fingerprint: string;
    readonly projectIds: readonly string[];
    readonly canRun: boolean;
    readonly trigger: string;
}

/** Reads the sentinel synchronously. Returns null when absent or malformed. */
export function readSentinel(): SentinelSnapshot | null {
    try {
        const sentinelEl = document.getElementById(SENTINEL_ID);
        const isMissing = sentinelEl === null;
        if (isMissing) {
            return null;
        }
        const fingerprint = sentinelEl.getAttribute(ATTR_FP) ?? "";
        const projectsCsv = sentinelEl.getAttribute(ATTR_PROJECTS) ?? "";
        const canRunRaw = sentinelEl.getAttribute(ATTR_CAN_RUN) ?? "false";
        const trigger = sentinelEl.getAttribute(ATTR_TRIGGER) ?? "";
        const projectIds = projectsCsv.length > 0
            ? projectsCsv.split(",").filter((s) => s.length > 0)
            : [];
        return {
            fingerprint,
            projectIds,
            canRun: canRunRaw === "true",
            trigger,
        };
    } catch {
        return null;
    }
}

/** Convenience: true iff the sentinel says at least one project applies. */
export function isExtensionApplicableHere(): boolean {
    return readSentinel()?.canRun === true;
}
