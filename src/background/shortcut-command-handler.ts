/**
 * Marco Extension — Shortcut Command Handler
 *
 * Handles keyboard command events from manifest.json.
 * Current command: run-scripts (Ctrl+Shift+Down by default).
 *
 * @see spec/05-chrome-extension/18-message-protocol.md — Message types
 */

import type { ScriptEntry } from "../shared/project-types";
import type { InjectScriptsResponse } from "../shared/injection-types";
import { normalizeInjectScriptsResponse } from "../shared/injection-types";
import { MessageType } from "../shared/messages";
import { handleMessage } from "./message-router";
import { logCaughtError, logBgWarnError, BgLogTag} from "./bg-logger";
import { loadSession, persistSession } from "./recorder/recorder-session-storage";
import { recorderReducer, IDLE_SESSION } from "./recorder/recorder-store";
import { isNewTabOrBlankUrl } from "../shared/url-utils";
import { evaluateUrlMatches } from "./project-matcher";

const RUN_SCRIPTS_COMMAND = "run-scripts";
const FORCE_RUN_SCRIPTS_COMMAND = "force-run-scripts";
const TOGGLE_RECORDING_COMMAND = "toggle-recording";

interface ActiveProjectResponse {
    activeProject?: {
        id?: string;
        name?: string;
        slug?: string;
        scripts?: ScriptEntry[];
    } | null;
}

/** Registers chrome.commands listeners. */
export function registerShortcutCommands(): void {
    chrome.commands.onCommand.addListener((command) => {
        console.log("[Marco] Shortcut command received: %s at %s", command, new Date().toISOString());

        if (command === RUN_SCRIPTS_COMMAND) {
            void runScriptsFromShortcut(false);
        } else if (command === FORCE_RUN_SCRIPTS_COMMAND) {
            void runScriptsFromShortcut(true);
        } else if (command === TOGGLE_RECORDING_COMMAND) {
            void toggleRecordingFromShortcut();
        }
    });

    // Log registered commands for debugging — verify shortcut is actually assigned
    chrome.commands.getAll((commands) => {
        const runCmd = commands.find((c) => c.name === RUN_SCRIPTS_COMMAND);
        if (runCmd) {
            const shortcut = runCmd.shortcut || "";
            if (shortcut) {
                console.log("[Marco] ✅ Shortcut registered: %s → %s", RUN_SCRIPTS_COMMAND, shortcut);
            } else {
                logBgWarnError(BgLogTag.SHORTCUT, `Shortcut '${RUN_SCRIPTS_COMMAND}' exists but has NO key binding assigned! Go to chrome://extensions/shortcuts to assign one.`);
            }
        } else {
            logBgWarnError(BgLogTag.SHORTCUT, `Shortcut '${RUN_SCRIPTS_COMMAND}' not found in manifest commands — check manifest.json`);
        }

        // Log all registered commands for cross-reference
        console.log("[Marco] All registered commands: %s",
            commands.map(c => `${c.name}=${c.shortcut || "(none)"}`).join(", "));
    });
}

/** Runs active project scripts in the currently active tab. */
async function runScriptsFromShortcut(forceReload: boolean): Promise<void> {
    const t0 = performance.now();

    try {
        const tab = await getActiveTab();

        if (tab === null || typeof tab.id !== "number") {
            logBgWarnError(BgLogTag.SHORTCUT, "Aborting: no active tab found (reason=no-active-tab)");
            return;
        }

        const activeTabId = tab.id;
        const tabUrl = tab.url ?? "";

        if (isNewTabOrBlankUrl(tabUrl)) {
            logBgWarnError(BgLogTag.SHORTCUT, `Aborting: active tab is a new-tab/blank page (tabId=${activeTabId}, url='${tabUrl}', reason=new-tab-blank-url)`);
            return;
        }

        console.log("[Marco] Shortcut: active tab=%d url='%s', fetching project scripts...%s", activeTabId, tabUrl, forceReload ? " (FORCE RUN)" : "");

        const { scripts, source, projectLabel } = await resolveScriptsForShortcut(tabUrl);

        if (scripts.length === 0) {
            logBgWarnError(
                BgLogTag.SHORTCUT,
                `Aborting: no scripts to inject (tabId=${activeTabId}, url='${tabUrl}', project=${projectLabel}, source=${source}, reason=empty-script-set). ` +
                `Hint: open the popup to confirm an active project is set and has enabled scripts, or add a URL rule so auto-attach can resolve scripts for this page.`,
            );
            return;
        }

        console.log("[Marco] Shortcut: injecting %d scripts into tab %d (project=%s, source=%s)", scripts.length, activeTabId, projectLabel, source);

        const rawResponse = await sendInternalMessage<InjectScriptsResponse>({
            type: MessageType.INJECT_SCRIPTS,
            tabId: activeTabId,
            scripts,
            launchSource: "manual",
            // v3.20.0: all manual shortcut launches force a reload so the per-page
            // body-marker dedup never silently absorbs a deliberate re-run.
            // Mirrors the popup Run button's behavior (`use-popup-actions.ts`).
            forceReload: true,
        });
        const response = normalizeInjectScriptsResponse(rawResponse);

        const elapsed = Math.round(performance.now() - t0);
        const resultCount = response.results.length;
        if (response.inlineSyntaxFlagSource === "legacy-default") {
            console.warn("[Marco] Shortcut: response missing inlineSyntaxErrorDetected — older background build, defaulting to false");
        }

        console.log("[Marco] Shortcut: injection complete — %d results in %dms (inlineSyntaxErrorDetected=%s, source=%s)",
            resultCount, elapsed, response.inlineSyntaxErrorDetected, response.inlineSyntaxFlagSource);
    } catch (runError) {
        logCaughtError(BgLogTag.SHORTCUT, "Shortcut run failed", runError);
    }
}

/** Returns the active tab (with url), or null if unavailable. */
async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab ?? null;
    } catch (err) {
        logCaughtError(BgLogTag.SHORTCUT, "chrome.tabs.query failed", err);
        return null;
    }
}

interface ResolvedShortcutScripts {
    scripts: ScriptEntry[];
    /** Where the scripts came from for diagnostics. */
    source: "active-project" | "none";
    /** Human-readable project label, e.g. `"My Project" (id=abc)` or `none`. */
    projectLabel: string;
}

/**
 * Resolves scripts to inject for a manual shortcut press.
 *
 * Uses the active project's scripts (mirrors popup Run). When unavailable,
 * also probes URL-based project matches purely for diagnostics so the empty-set
 * abort can name the missing binding / matched project candidates.
 */
export async function resolveScriptsForShortcut(tabUrl: string): Promise<ResolvedShortcutScripts> {
    const response = await sendInternalMessage<ActiveProjectResponse>({
        type: MessageType.GET_ACTIVE_PROJECT,
    });

    const project = response?.activeProject ?? null;
    const projectLabel = project
        ? `"${project.name ?? "?"}" (id=${project.id ?? "?"})`
        : "none";

    const projectScripts = Array.isArray(project?.scripts) ? project.scripts : [];

    if (project && projectScripts.length > 0) {
        console.log("[Marco] Shortcut: using active project=%s with %d scripts", projectLabel, projectScripts.length);
        return { scripts: projectScripts, source: "active-project", projectLabel };
    }

    // Diagnostic-only probe: surface what auto-attach would have matched so
    // the empty-set warn explains *why* nothing ran.
    const reason = project ? "active-project-has-no-scripts" : "no-active-project-set";
    try {
        const matches = await evaluateUrlMatches(tabUrl);
        const matchedProjectIds = matches.map((m) => m.projectId).filter(Boolean);
        console.log(
            "[Marco] Shortcut: active-project resolution empty (reason=%s, project=%s); URL '%s' would auto-attach to %d project(s): [%s]",
            reason, projectLabel, tabUrl, matchedProjectIds.length, matchedProjectIds.join(", "),
        );
    } catch (probeErr) {
        logCaughtError(BgLogTag.SHORTCUT, "URL auto-attach probe failed", probeErr);
    }

    return { scripts: [], source: "none", projectLabel };
}

/**
 * Dispatches an internal message through the background router.
 * Uses a properly resolved promise pattern compatible with service workers.
 */
function sendInternalMessage<T>(message: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
        const sender = {} as chrome.runtime.MessageSender;

        // handleMessage is async — it calls sendResponse when done
        handleMessage(message, sender, (response: unknown) => {
            resolve(response as T);
        }).catch((err: unknown) => {
            logCaughtError(BgLogTag.SHORTCUT, "Internal message dispatch error", err);
            reject(err);
        });
    });
}

/* ------------------------------------------------------------------ */
/*  Toggle Recording                                                   */
/* ------------------------------------------------------------------ */

/**
 * Advances the recorder state machine via the toolbar's primary control:
 *   Idle      → Start recording
 *   Recording → Pause
 *   Paused    → Resume
 *
 * Loaded lazily so the recorder modules (which import sql.js indirectly)
 * do not bloat service-worker cold start. See Phase 05 spec
 * `spec/26-chrome-extension-generic/06-ui-and-design-system/10-toolbar-recording-ux.md`.
 */
async function toggleRecordingFromShortcut(): Promise<void> {
    try {
        const current = (await loadSession()) ?? IDLE_SESSION;
        const projectSlug = await getActiveProjectSlug();
        if (current.Phase === "Idle" && projectSlug === null) {
            logBgWarnError(BgLogTag.SHORTCUT, "Toggle-recording: no active project — aborting Start");
            return;
        }

        const action = chooseToggleAction(current.Phase, projectSlug ?? current.ProjectSlug);
        const next = recorderReducer(current, action);
        await persistSession(next);
        console.log("[Marco] Recorder phase: %s → %s (session=%s)", current.Phase, next.Phase, next.SessionId || "(cleared)");
    } catch (err) {
        logCaughtError(BgLogTag.SHORTCUT, "Toggle-recording shortcut failed", err);
    }
}

/** Returns the recorder action that the primary toolbar button maps to. */
function chooseToggleAction(
    phase: "Idle" | "Recording" | "Paused",
    projectSlug: string,
): import("./recorder/recorder-store").RecorderAction {
    if (phase === "Idle") {
        return { Kind: "Start", ProjectSlug: projectSlug, SessionId: generateSessionId(), StartedAt: new Date().toISOString() };
    }
    if (phase === "Recording") { return { Kind: "Pause" }; }
    return { Kind: "Resume" };
}

function generateSessionId(): string {
    // ULID-ish: timestamp + 8 random hex chars. Sortable + collision-safe enough
    // for one-session-at-a-time recorder use.
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(16).slice(2, 10).padStart(8, "0");
    return `${ts}-${rand}`;
}

async function getActiveProjectSlug(): Promise<string | null> {
    const response = await sendInternalMessage<ActiveProjectResponse>({
        type: MessageType.GET_ACTIVE_PROJECT,
    });
    const slug = response?.activeProject?.slug;
    return typeof slug === "string" && slug.length > 0 ? slug : null;
}
