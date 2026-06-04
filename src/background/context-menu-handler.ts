/**
 * Marco Extension — Context Menu Handler
 *
 * Creates and manages the browser right-click context menu.
 * Available on all pages. Provides quick access to:
 *   - Project selection (radio-style submenu)
 *   - Run / Re-inject scripts
 *   - Copy recent logs to clipboard
 *   - Export logs (JSON)
 *
 * See spec/05-chrome-extension/testing/03-context-menu-spec.md
 */

import { MessageType } from "../shared/messages";
import { handleMessage } from "./message-router";
import { logCaughtError, BgLogTag} from "./bg-logger";

/* ------------------------------------------------------------------ */
/*  Menu IDs                                                           */
/* ------------------------------------------------------------------ */

const MENU_ID = {
    ROOT: "marco-root",
    PROJECT_PARENT: "marco-projects",
    RUN: "marco-run",
    FORCE_RUN: "marco-force-run",
    REINJECT: "marco-reinject",
    SEP1: "marco-sep-1",
    COPY_LOGS: "marco-copy-logs",
    EXPORT_LOGS: "marco-export-logs",
    SEP2: "marco-sep-2",
    STATUS: "marco-status",
} as const;

/* ------------------------------------------------------------------ */
/*  Create Static Menu Structure                                       */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line max-lines-per-function
function createStaticMenuItems(): void {
    const manifest = chrome.runtime?.getManifest?.();
    const version = manifest?.version ?? "?";

    chrome.contextMenus.create({
        id: MENU_ID.ROOT,
        title: `Marco v${version}`,
        contexts: ["all"],
    });

    chrome.contextMenus.create({
        id: MENU_ID.PROJECT_PARENT,
        parentId: MENU_ID.ROOT,
        title: "Select Project",
        contexts: ["all"],
    });

    chrome.contextMenus.create({
        id: MENU_ID.SEP1,
        parentId: MENU_ID.ROOT,
        type: "separator",
        contexts: ["all"],
    });

    chrome.contextMenus.create({
        id: MENU_ID.RUN,
        parentId: MENU_ID.ROOT,
        title: "▶ Run Scripts",
        contexts: ["all"],
    });

    chrome.contextMenus.create({
        id: MENU_ID.FORCE_RUN,
        parentId: MENU_ID.ROOT,
        title: "⚡ Force Run (bypass cache)",
        contexts: ["all"],
    });

    chrome.contextMenus.create({
        id: MENU_ID.REINJECT,
        parentId: MENU_ID.ROOT,
        title: "🔄 Re-inject Scripts",
        contexts: ["all"],
    });

    chrome.contextMenus.create({
        id: MENU_ID.SEP2,
        parentId: MENU_ID.ROOT,
        type: "separator",
        contexts: ["all"],
    });

    chrome.contextMenus.create({
        id: MENU_ID.COPY_LOGS,
        parentId: MENU_ID.ROOT,
        title: "📋 Copy Recent Logs",
        contexts: ["all"],
    });

    chrome.contextMenus.create({
        id: MENU_ID.EXPORT_LOGS,
        parentId: MENU_ID.ROOT,
        title: "📦 Export Logs (JSON)",
        contexts: ["all"],
    });

    chrome.contextMenus.create({
        id: MENU_ID.SEP2 + "-end",
        parentId: MENU_ID.ROOT,
        type: "separator",
        contexts: ["all"],
    });

    chrome.contextMenus.create({
        id: MENU_ID.STATUS,
        parentId: MENU_ID.ROOT,
        title: "ℹ Status",
        contexts: ["all"],
    });
}

/* ------------------------------------------------------------------ */
/*  Dynamic Project Submenu                                            */
/* ------------------------------------------------------------------ */

const PROJECT_ID_PREFIX = "marco-project-";

// Serialize rebuilds: concurrent SET_ACTIVE_PROJECT / SAVE_PROJECT bursts were
// racing on `trackedProjectIds`, so two rebuilds both saw the same "existing"
// list, both removed it, then both tried to re-create the same ids → Chrome
// fired "Cannot create item with duplicate id marco-project-<id>". A single
// in-flight promise + a `pending` flag coalesces overlapping calls.
let rebuildInFlight: Promise<void> | null = null;
let rebuildPending = false;

function removeMenuItem(menuId: string): Promise<void> {
    return new Promise((resolve) => {
        try {
            chrome.contextMenus.remove(menuId, () => {
                // Swallow lastError: stale id during rebuild is expected.
                void chrome.runtime.lastError;
                resolve();
            });
        } catch (removeErr) {
            logCaughtError(
                BgLogTag.CONTEXT_MENU,
                `chrome.contextMenus.remove("${menuId}") threw during submenu rebuild — continuing; user-visible regression possible if menu count diverges`,
                removeErr,
            );
            resolve();
        }
    });
}

function createMenuItemSafe(props: chrome.contextMenus.CreateProperties): void {
    try {
        chrome.contextMenus.create(props, () => {
            const err = chrome.runtime.lastError;
            if (err) {
                // Duplicate-id collisions are recoverable: log once and move on.
                logCaughtError(
                    BgLogTag.CONTEXT_MENU,
                    `chrome.contextMenus.create("${String(props.id)}") failed — ${err.message}; menu item dropped this rebuild`,
                    new Error(err.message),
                );
            }
        });
    } catch (createErr) {
        logCaughtError(
            BgLogTag.CONTEXT_MENU,
            `chrome.contextMenus.create("${String(props.id)}") threw — dropping item this rebuild`,
            createErr,
        );
    }
}

async function rebuildProjectSubmenu(): Promise<void> {
    // If a rebuild is already running, mark that another is needed and reuse
    // the in-flight promise. After it settles, we'll run exactly one more pass.
    if (rebuildInFlight) {
        rebuildPending = true;
        return rebuildInFlight;
    }

    rebuildInFlight = (async () => {
        do {
            rebuildPending = false;
            await doRebuildProjectSubmenu();
        } while (rebuildPending);
    })().finally(() => {
        rebuildInFlight = null;
    });

    return rebuildInFlight;
}

async function doRebuildProjectSubmenu(): Promise<void> {
    // Snapshot + clear tracker BEFORE awaiting removes so a re-entrant call
    // won't try to remove the same ids again.
    const existingMenuIds = trackedProjectIds;
    trackedProjectIds = [];

    await Promise.all(existingMenuIds.map(removeMenuItem));

    const projectData = await sendInternalMessage<{
        activeProject: { id: string; name: string } | null;
        allProjects: Array<{ id: string; name: string }>;
    }>({ type: MessageType.GET_ACTIVE_PROJECT });

    const activeId = projectData?.activeProject?.id ?? null;
    const projects = projectData?.allProjects ?? [];
    const hasProjects = projects.length > 0;

    if (!hasProjects) {
        createNoProjectsMenuItem();
        return;
    }

    // De-duplicate by id in case upstream returned duplicates (root cause of
    // "duplicate id" warnings when two projects shared an id).
    const uniqueProjects = dedupeProjectsById(projects);

    const nextIds: string[] = [];
    for (const project of uniqueProjects) {
        const isActive = project.id === activeId;
        const menuId = PROJECT_ID_PREFIX + project.id;
        createMenuItemSafe({
            id: menuId,
            parentId: MENU_ID.PROJECT_PARENT,
            type: "radio",
            title: project.name,
            checked: isActive,
            contexts: ["all"],
        });
        nextIds.push(menuId);
    }

    trackedProjectIds = nextIds;
}

function createNoProjectsMenuItem(): void {
    createMenuItemSafe({
        id: PROJECT_ID_PREFIX + "none",
        parentId: MENU_ID.PROJECT_PARENT,
        title: "(no projects)",
        enabled: false,
        contexts: ["all"],
    });
}

function dedupeProjectsById<T extends { id: string }>(projects: T[]): T[] {
    const seen = new Set<string>();
    return projects.filter((project) => {
        if (seen.has(project.id)) return false;
        seen.add(project.id);
        return true;
    });
}

let trackedProjectIds: string[] = [];


/* ------------------------------------------------------------------ */
/*  Internal Message Dispatch                                          */
/* ------------------------------------------------------------------ */

function sendInternalMessage<T>(message: Record<string, unknown>): Promise<T> {
    return new Promise((resolve) => {
        const dummySender = {} as chrome.runtime.MessageSender;
        handleMessage(message, dummySender, (response: unknown) => {
            resolve(response as T);
        });
    });
}

/* ------------------------------------------------------------------ */
/*  Click Handler                                                      */
/* ------------------------------------------------------------------ */

async function handleMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab,
): Promise<void> {
    const menuItemId = String(info.menuItemId);
    const isProjectSelection = menuItemId.startsWith(PROJECT_ID_PREFIX);
    const tabId = tab?.id ?? 0;

    if (isProjectSelection) {
        const projectId = menuItemId.replace(PROJECT_ID_PREFIX, "");
        await sendInternalMessage({ type: MessageType.SET_ACTIVE_PROJECT, projectId });
        return;
    }

    switch (menuItemId) {
        case MENU_ID.RUN:
            await handleRunScripts(tabId, false);
            break;

        case MENU_ID.FORCE_RUN:
            await handleRunScripts(tabId, true);
            break;

        case MENU_ID.REINJECT:
            await handleReinjectScripts(tabId);
            break;

        case MENU_ID.COPY_LOGS:
            await handleCopyLogs(tabId);
            break;

        case MENU_ID.EXPORT_LOGS:
            await sendInternalMessage({ type: MessageType.EXPORT_LOGS_JSON });
            break;

        case MENU_ID.STATUS:
            await handleShowStatus(tabId);
            break;
    }
}

/* ------------------------------------------------------------------ */
/*  Action Implementations                                             */
/* ------------------------------------------------------------------ */

async function handleRunScripts(tabId: number, forceReload = false): Promise<void> {
    const hasValidTab = tabId > 0;
    if (!hasValidTab) return;

    const scriptsData = await sendInternalMessage<{ scripts: Array<{ id: string; isEnabled: boolean; code?: string }> }>({
        type: MessageType.GET_ALL_SCRIPTS,
    });

    const enabledScripts = (scriptsData?.scripts ?? []).filter((s) => s.isEnabled !== false);
    const hasScripts = enabledScripts.length > 0;

    if (!hasScripts) return;

    await sendInternalMessage({
        type: MessageType.INJECT_SCRIPTS,
        tabId,
        scripts: enabledScripts,
        launchSource: "manual",
        // v3.20.0: always force on manual context-menu runs (parity with popup
        // Run and shortcut). The `forceReload` parameter is now historical —
        // both "Run" and "Force Run" context-menu entries behave identically.
        forceReload: true,
    });
}

async function handleReinjectScripts(tabId: number): Promise<void> {
    const hasValidTab = tabId > 0;
    if (!hasValidTab) return;

    // Remove existing markers before re-injecting
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const markerIds = [
                    "ahk-loop-script",
                    "ahk-combo-script",
                    "marco-auth-panel",
                    "marco-controller-marker",
                ];
                for (const id of markerIds) {
                    const element = document.getElementById(id);
                    if (element) element.remove();
                }
            },
        });
    } catch (markerCleanupErr) {
        // Tab may be a restricted scheme (chrome://, devtools://, web store) where
        // chrome.scripting.executeScript is denied — log at warn level so repeated
        // failures surface, then continue to handleRunScripts() which will retry
        // injection through the standard guarded path.
        logCaughtError(
            BgLogTag.CONTEXT_MENU,
            `Marker cleanup executeScript failed for tabId=${tabId}; tab likely on a restricted scheme (chrome://, devtools://, Web Store) — proceeding to handleRunScripts() anyway`,
            markerCleanupErr instanceof Error ? markerCleanupErr : new Error(String(markerCleanupErr)),
        );
    }

    await handleRunScripts(tabId);
}

async function handleCopyLogs(tabId: number): Promise<void> {
    const logsData = await sendInternalMessage<{ logs: Array<Record<string, unknown>> }>({
        type: MessageType.GET_RECENT_LOGS,
        limit: 50,
    });

    const logs = logsData?.logs ?? [];
    const logText = JSON.stringify(logs, null, 2);

    // Copy to clipboard via content script injection
    const hasValidTab = tabId > 0;
    if (hasValidTab) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                func: (text: string) => {
                    navigator.clipboard.writeText(text).catch((clipErr) => {
                        console.error("[context-menu::copyLogs] Clipboard write failed\n  Path: navigator.clipboard (browser API)\n  Missing: Successful clipboard write of log text\n  Reason: " + (clipErr && clipErr.message ? clipErr.message : String(clipErr)) + " — page may not have clipboard permission or focus");
                    });
                },
                args: [logText],
            });
        } catch {
            logCaughtError(BgLogTag.MARCO, "Could not inject clipboard script", new Error("injection failed"));
        }
    }
}

async function handleShowStatus(tabId: number): Promise<void> {
    const statusData = await sendInternalMessage<Record<string, unknown>>({
        type: MessageType.GET_STATUS,
    });

    const statusText = JSON.stringify(statusData, null, 2);
    const hasValidTab = tabId > 0;

    if (hasValidTab) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                func: (text: string) => {
                    console.log("[Marco Status]", text);
                    alert(`Marco Status:\n${text}`);
                },
                args: [statusText],
            });
        } catch {
            logCaughtError(BgLogTag.MARCO, "Could not show status", new Error("injection failed"));
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Registration                                                       */
/* ------------------------------------------------------------------ */

export function registerContextMenu(): void {
    // Remove all existing items first to avoid duplicate-id errors on SW restart
    chrome.contextMenus.removeAll(() => {
        createStaticMenuItems();
        void rebuildProjectSubmenu();
    });

    chrome.contextMenus.onClicked.addListener(handleMenuClick);

    // Listen for project changes to keep menu in sync
    chrome.runtime.onMessage.addListener((message) => {
        const messageType = (message as Record<string, unknown>)?.type;
        const isProjectChange =
            messageType === MessageType.SET_ACTIVE_PROJECT ||
            messageType === MessageType.SAVE_PROJECT ||
            messageType === MessageType.DELETE_PROJECT;

        if (isProjectChange) {
            void rebuildProjectSubmenu();
        }
    });

    console.log("[Marco] ✓ Context menu registered");
}
