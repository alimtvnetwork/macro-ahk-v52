/**
 * Marco Extension — Injection Dependency Builder
 *
 * Reads the active project's dependency graph and prepends dependency
 * project scripts in topological order (globals first) before the
 * caller-provided scripts. Extracted from injection-handler.ts (PERF-R2).
 *
 * Global projects (isGlobal === true) are ALWAYS injected before any matched
 * project, even if not explicitly listed as dependencies.
 *
 * @see .lovable/memory/features/projects/global-project-injection-policy.md
 * @see src/background/handlers/injection-handler.ts — pipeline orchestrator
 */

import type { StoredProject, ScriptEntry } from "../../shared/project-types";
import { logBgWarnError, BgLogTag } from "../bg-logger";
import { getActiveProjectId } from "../state-manager";
import { resolveInjectionOrder, type ProjectNode } from "../dependency-resolver";

// eslint-disable-next-line max-lines-per-function, sonarjs/cognitive-complexity
export async function prependDependencyScripts(callerScripts: ScriptEntry[], allProjects: StoredProject[]): Promise<ScriptEntry[]> {
    const activeId = getActiveProjectId();
    if (!activeId) return callerScripts;

    const activeProject = allProjects.find((p) => p.id === activeId);
    if (!activeProject) return callerScripts;

    const globalProjects = allProjects.filter(
        (p) => p.isGlobal === true && p.id !== activeId,
    );

    const relevantIds = new Set<string>([activeId]);
    for (const gp of globalProjects) {
        relevantIds.add(gp.id);
    }
    const queue = [...(activeProject.dependencies ?? []).map((d) => d.projectId)];

    while (queue.length > 0) {
        const depId = queue.shift()!;
        if (relevantIds.has(depId)) continue;
        relevantIds.add(depId);
        const depProject = allProjects.find((p) => p.id === depId);
        if (depProject?.dependencies) {
            for (const sub of depProject.dependencies) {
                if (!relevantIds.has(sub.projectId)) queue.push(sub.projectId);
            }
        }
    }

    for (const requiredProjectId of ["marco-sdk", "xpath"]) {
        const requiredProject = allProjects.find((p) => p.id === requiredProjectId);
        if (requiredProject && requiredProject.id !== activeId) {
            relevantIds.add(requiredProject.id);
        }
    }

    const nodes: ProjectNode[] = allProjects
        .filter((p) => relevantIds.has(p.id))
        .map((p) => ({
            id: p.id,
            name: p.name,
            version: p.version,
            isGlobal: p.isGlobal === true,
            dependencies: (p.dependencies ?? []).map((d) => ({
                projectId: d.projectId,
                version: d.version,
            })),
        }));

    const resolution = resolveInjectionOrder(nodes);

    if (!resolution.isSuccess) {
        logBgWarnError(BgLogTag.INJECTION_DEPS, `Dependency resolution failed: ${resolution.errorMessage}`);
        return [...collectGlobalScripts(globalProjects), ...callerScripts];
    }

    const callerScriptKeys = new Set(
        callerScripts
            .map(getScriptIdentity)
            .filter((value): value is string => value !== null),
    );

    const projectOrderIndex = new Map<string, number>();
    for (const [index, projectId] of resolution.order.entries()) {
        projectOrderIndex.set(projectId, index);
    }

    const scriptKeyToProjectId = new Map<string, string>();
    for (const project of allProjects) {
        if (!relevantIds.has(project.id)) continue;
        for (const script of project.scripts ?? []) {
            scriptKeyToProjectId.set(normalizeScriptIdentity(script.path), project.id);
        }
    }

    const depScripts: ScriptEntry[] = [];
    for (const projectId of resolution.order) {
        if (projectId === activeId) continue;
        const depProject = allProjects.find((p) => p.id === projectId);
        if (!depProject?.scripts?.length) continue;

        const baseOrder = -1000 + depScripts.length;
        for (const [scriptIndex, script] of depProject.scripts.entries()) {
            if (callerScriptKeys.has(normalizeScriptIdentity(script.path))) {
                continue;
            }
            depScripts.push({
                ...script,
                order: baseOrder + (script.order ?? scriptIndex),
            });
        }

        console.log("[injection:deps] Prepending %d scripts from %s \"%s\" (id=%s)",
            depProject.scripts.length,
            depProject.isGlobal ? "global" : "dependency",
            depProject.name, depProject.id);
    }

    if (depScripts.length === 0) return callerScripts;

    const reorderedCallerScripts = callerScripts.map((script, index) => {
        if (!isScriptEntryLike(script)) return script;

        const scriptKey = getScriptIdentity(script);
        if (!scriptKey) return script;

        const projectId = scriptKeyToProjectId.get(scriptKey);
        const projectRank = projectId !== undefined
            ? projectOrderIndex.get(projectId)
            : undefined;

        if (projectRank === undefined) return script;

        return {
            ...script,
            order: projectRank * 1000 + (script.order ?? index),
        };
    });

    console.log("[injection:deps] Total: %d dependency scripts + %d caller scripts",
        depScripts.length, callerScripts.length);

    return [...depScripts, ...reorderedCallerScripts];
}

/** Fallback: collects scripts from global projects when topological sort fails. */
export function collectGlobalScripts(globalProjects: StoredProject[]): ScriptEntry[] {
    const scripts: ScriptEntry[] = [];
    for (const gp of globalProjects) {
        if (!gp.scripts?.length) continue;
        const baseOrder = -2000 + scripts.length;
        for (const script of gp.scripts) {
            scripts.push({ ...script, order: baseOrder + script.order });
        }
    }
    return scripts;
}

export function isScriptEntryLike(value: unknown): value is { path?: string; id?: string; name?: string; order?: number } {
    return typeof value === "object" && value !== null;
}

export function getScriptIdentity(value: unknown): string | null {
    if (!isScriptEntryLike(value)) return null;

    const candidate = typeof value.path === "string"
        ? value.path
        : typeof value.id === "string"
            ? value.id
            : typeof value.name === "string"
                ? value.name
                : null;

    return candidate ? normalizeScriptIdentity(candidate) : null;
}

export function normalizeScriptIdentity(value: string): string {
    const normalized = value.trim().toLowerCase().replace(/\\/g, "/");
    const fileName = normalized.split("/").pop() ?? normalized;
    return fileName.split(/[?#]/)[0] ?? fileName;
}
