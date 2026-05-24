/**
 * Marco Extension — Namespace Bootstrap
 *
 * Bootstraps `window.RiseupAsiaMacroExt` root namespace + Settings + per-project
 * namespaces in the page's MAIN world. Extracted from injection-handler.ts
 * (PERF-R2) so the orchestrator stays under the cognitive-complexity budget.
 *
 * @see src/background/handlers/injection-handler.ts — pipeline orchestrator
 */

import type { StoredProject } from "../../shared/project-types";
import { logBgWarnError, logCaughtError, BgLogTag } from "../bg-logger";
import { getActiveProjectId } from "../state-manager";
import { injectWithCspFallback } from "../csp-fallback";
import { transitionHealth } from "../health-handler";
import { handleGetSettings } from "./settings-handler";
import { getFilesByProject } from "./file-storage-handler";
import { generateLlmGuide } from "../../lib/generate-llm-guide";
import { toCodeName, slugify } from "../../lib/slug-utils";
import { STORAGE_KEY_ALL_CONFIGS } from "../../shared/constants";
import { readNamespaceCaches } from "../namespace-cache";
import { hashSettingsKey, getSettingsNsCache, setSettingsNsCache } from "../settings-ns-cache";
import { buildProjectNamespaceScript } from "../project-namespace-builder";
import { buildSettingsNamespaceScript } from "../settings-namespace-builder";

/** LLM guide cache — keyed by `codeName:slug`, avoids regenerating ~10KB template per injection */
const _llmGuideCache = new Map<string, string>();

/**
 * Bootstraps `window.RiseupAsiaMacroExt = { Projects: {} }` in the page's
 * MAIN world before any scripts or namespaces are injected.
 */
export async function bootstrapNamespaceRoot(tabId: number): Promise<void> {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const win = window as unknown as Record<string, unknown>;
                if (!win.RiseupAsiaMacroExt) {
                    win.RiseupAsiaMacroExt = { Projects: {} };
                } else {
                    const ext = win.RiseupAsiaMacroExt as Record<string, unknown>;
                    if (!ext.Projects) {
                        ext.Projects = {};
                    }
                }
            },
            world: "MAIN" as chrome.scripting.ExecutionWorld,
        });
        console.log("[injection:bootstrap] ✅ RiseupAsiaMacroExt root bootstrapped in MAIN world (tab %d)", tabId);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logCaughtError(BgLogTag.INJECTION_BOOTSTRAP, `CRITICAL — Failed to bootstrap namespace\n  Path: chrome.scripting.executeScript → tabId=${tabId}, world=MAIN\n  Missing: window.RiseupAsiaMacroExt root namespace object\n  Reason: ${msg} — chrome.scripting.executeScript itself was blocked (not CSP — likely tab closed or restricted page)`, err);
        transitionHealth("DEGRADED", "RiseupAsiaMacroExt MAIN world bootstrap failed");

        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    console.error(
                        "%c[Marco Extension] ⚠️ MAIN world namespace bootstrap failed",
                        "color: red; font-weight: bold; font-size: 14px;",
                        "\n\nRiseupAsiaMacroExt.Projects.* will NOT be available in the console.",
                        "\n\nWorkaround: Use window.marco.* API directly (available in the injected script world).",
                    );
                },
                world: "MAIN" as chrome.scripting.ExecutionWorld,
            });
        } catch (warnErr) {
            logBgWarnError(BgLogTag.INJECTION, "MAIN-world bootstrap-warning script failed to inject (best-effort console banner suppressed)", warnErr);
        }
    }
}

/**
 * Injects `window.RiseupAsiaMacroExt.Settings` with current extension
 * settings as a frozen read-only object.
 */
export async function injectSettingsNamespace(tabId: number, allProjects: StoredProject[]): Promise<void> {
    try {
        const activeId = getActiveProjectId();
        const activeProject = activeId ? allProjects.find((p) => p.id === activeId) : undefined;
        const codeName = activeProject
            ? (activeProject.codeName || toCodeName(activeProject.slug || slugify(activeProject.name)))
            : "Default";
        const slug = activeProject
            ? (activeProject.slug || slugify(activeProject.name))
            : "default";

        const guideKey = `${codeName}:${slug}`;
        if (!_llmGuideCache.has(guideKey)) {
            _llmGuideCache.set(guideKey, generateLlmGuide(codeName, slug));
        }
        const llmGuide = _llmGuideCache.get(guideKey)!;

        const { settings } = await handleGetSettings();
        const settingsHash = hashSettingsKey(settings as unknown as Record<string, unknown>, guideKey);
        let script = getSettingsNsCache(settingsHash);
        if (script) {
            console.log("[injection:settings] Phase 10: using cached settings namespace script");
        } else {
            script = buildSettingsNamespaceScript(settings, llmGuide);
            setSettingsNsCache(settingsHash, script);
            console.log("[injection:settings] Phase 10: rebuilt and cached settings namespace script (%d chars)", script.length);
        }
        const result = await injectWithCspFallback(tabId, script, "MAIN");
        if (result.isFallback) {
            logBgWarnError(BgLogTag.INJECTION_SETTINGS, `CRITICAL — Settings namespace injected via ${result.world} fallback (tab ${tabId}). RiseupAsiaMacroExt.Settings will NOT be visible in the page console.`);
            transitionHealth("DEGRADED", "Settings namespace fell back to " + result.world + " — not visible in MAIN world");
        } else {
            console.log("[injection:settings] Registered RiseupAsiaMacroExt.Settings + docs (port=%d)", settings.broadcastPort);
        }
    } catch (err) {
        logCaughtError(BgLogTag.INJECTION_SETTINGS, "Failed to register settings namespace", err);
    }
}

/**
 * After scripts are injected, registers per-project namespaces under
 * `window.RiseupAsiaMacroExt.Projects.<CodeName>` for each project
 * in the dependency chain + the active project.
 */
// eslint-disable-next-line max-lines-per-function, sonarjs/cognitive-complexity
export async function injectProjectNamespaces(tabId: number, allProjects: StoredProject[]): Promise<void> {
    const activeId = getActiveProjectId();
    if (!activeId) return;

    const activeProject = allProjects.find((p) => p.id === activeId);
    if (!activeProject) return;

    const projectIds = new Set<string>([activeId]);

    for (const p of allProjects) {
        if (p.isGlobal === true) projectIds.add(p.id);
    }

    const queue = (activeProject.dependencies ?? []).map((d) => d.projectId);
    while (queue.length > 0) {
        const depId = queue.shift()!;
        if (projectIds.has(depId)) continue;
        projectIds.add(depId);
        const dep = allProjects.find((p) => p.id === depId);
        if (dep?.dependencies) {
            for (const sub of dep.dependencies) {
                if (!projectIds.has(sub.projectId)) queue.push(sub.projectId);
            }
        }
    }

    let allConfigs: Array<Record<string, unknown>> = [];
    try {
        const configResult = await chrome.storage.local.get(STORAGE_KEY_ALL_CONFIGS);
        allConfigs = Array.isArray(configResult[STORAGE_KEY_ALL_CONFIGS])
            ? configResult[STORAGE_KEY_ALL_CONFIGS]
            : [];
    } catch (cfgErr) {
        logBgWarnError(BgLogTag.INJECTION, `chrome.storage.local.get("${STORAGE_KEY_ALL_CONFIGS}") failed — proceeding with empty configs[]`, cfgErr);
    }
    void allConfigs;

    const pidArray = [...projectIds];
    const cachedScripts = await readNamespaceCaches(pidArray);

    const nsScriptParts: string[] = [];
    const nsProjectNames: string[] = [];

    for (const pid of projectIds) {
        const project = allProjects.find((p) => p.id === pid);
        if (!project) continue;

        const projectSlug = project.slug || slugify(project.name);
        const codeName = project.codeName || toCodeName(projectSlug);

        if (codeName === "MacroController") {
            console.log("[injection:ns] Skipped generic namespace injection for \"%s\" (%s) — runtime namespace is owned by the script bundle", project.name, codeName);
            continue;
        }

        let nsScript = cachedScripts.get(pid);
        if (!nsScript) {
            let fileCache: Array<{ name: string; data: string }> = [];
            try {
                fileCache = getFilesByProject(pid, 50);
            } catch {
                fileCache = [];
            }

            nsScript = buildProjectNamespaceScript({
                codeName,
                slug: projectSlug,
                projectName: project.name,
                projectVersion: project.version,
                projectId: project.id,
                description: project.description,
                dependencies: (project.dependencies ?? []).map((d) => ({
                    projectId: d.projectId,
                    version: d.version,
                })),
                scripts: (project.scripts ?? []).map((s, i) => ({
                    name: s.path.split("/").pop() ?? s.path,
                    order: s.order ?? i,
                    isEnabled: true,
                })),
                fileCache,
                cookieBindings: (project.cookies ?? []).map((c) => ({
                    cookieName: c.cookieName,
                    url: c.url,
                    role: c.role,
                })),
            });
            console.log("[injection:ns] Cache miss for \"%s\" — built on-the-fly (%d chars)", project.name, nsScript.length);
        } else {
            console.log("[injection:ns] Cache hit for \"%s\" (%d chars)", project.name, nsScript.length);
        }

        nsScriptParts.push(nsScript);
        nsProjectNames.push(`${project.name} (${codeName})`);
    }

    if (nsScriptParts.length > 0) {
        const combinedNs = nsScriptParts.join("\n;\n");
        console.log("[injection:ns] Batch injecting %d namespaces (%d chars): [%s]",
            nsScriptParts.length, combinedNs.length, nsProjectNames.join(", "));

        try {
            const nsResult = await injectWithCspFallback(tabId, combinedNs, "MAIN");
            if (nsResult.isFallback) {
                logBgWarnError(BgLogTag.INJECTION_NS, `CRITICAL — ${nsScriptParts.length} namespaces injected via ${nsResult.world} fallback (tab ${tabId}). RiseupAsiaMacroExt.Projects.* will NOT be visible in page console.`);
                transitionHealth("DEGRADED", `Project namespaces fell back to ${nsResult.world} — not visible in MAIN world`);
            } else {
                console.log("[injection:ns] ✅ Registered %d namespaces in single IPC call", nsScriptParts.length);
            }
        } catch (err) {
            logCaughtError(BgLogTag.INJECTION_NS, "Batch namespace injection failed, falling back to sequential", err);
            for (let i = 0; i < nsScriptParts.length; i++) {
                try {
                    await injectWithCspFallback(tabId, nsScriptParts[i], "MAIN");
                    console.log("[injection:ns] Registered namespace for %s (sequential fallback)", nsProjectNames[i]);
                } catch (seqErr) {
                    logCaughtError(BgLogTag.INJECTION_NS, `Failed: ${nsProjectNames[i]}`, seqErr);
                }
            }
        }
    }
}
