/**
 * Marco Extension — Manifest-Driven Seeder
 *
 * Reads `seed-manifest.json` from extension dist and seeds scripts + configs
 * into chrome.storage.local. Replaces hardcoded seed chunks.
 *
 * The manifest is generated at build time by `scripts/generate-seed-manifest.mjs`.
 *
 * ── PascalCase storage layer (Phase 2c) ──
 *
 * Reads PascalCase keys from `seed-manifest.json` (the single source of
 * truth for everything we own). The only camelCase that survives is at
 * third-party boundaries — `chrome.storage.local` keys (StoredScript /
 * StoredConfig fields like `filePath`, `loadOrder`) are persistence
 * shapes the runtime hands directly to existing handlers and the
 * options UI; renaming them is its own dedicated migration.
 *
 * Schema versions accepted:
 *   - v2 (PascalCase manifest, current) — the canonical and ONLY shape
 *     this file targets. v1 (legacy camelCase) was retired alongside
 *     the storage-layer cleanup; a v1 manifest in dist/ is now a hard
 *     error so a stale build cannot silently corrupt the seed pass.
 */

import type { StoredScript, StoredConfig, UrlRule } from "../shared/script-config-types";
import type { StoredProject, ScriptEntry, ConfigEntry } from "../shared/project-types";
import type {
    SeedManifest,
    SeedProjectEntry,
    SeedScriptEntry,
    SeedConfigEntry,
} from "../shared/seed-manifest-types";
import { STORAGE_KEY_ALL_SCRIPTS, STORAGE_KEY_ALL_CONFIGS, STORAGE_KEY_ALL_PROJECTS } from "../shared/constants";
import { logBgWarnError, logCaughtError, BgLogTag} from "./bg-logger";

const MANIFEST_PATH = "projects/seed-manifest.json";

/**
 * Manifest projects whose StoredProject record is owned by `default-project-seeder.ts`.
 * They are still seeded for scripts/configs by this file, but their StoredProject
 * is skipped here to avoid double-write and keep a single source of truth.
 */
const PROJECT_OWNED_BY_DEFAULT_SEEDER = new Set<string>(["macro-controller", "marco-sdk"]);

const STUB_PREFIX = "// STUB: loaded from seed-manifest. Real code fetched at injection time via filePath.\n";

function buildStubCode(fileName: string): string {
    return STUB_PREFIX + `console.error("[manifest-seeder::buildStubCode] STUB: filePath fetch failed\\n  Path: projects/scripts/${fileName}\\n  Missing: Real script code for \\"${fileName}\\"\\n  Reason: Stub placeholder was never replaced — fetch at injection time did not succeed or was not attempted");`;
}

/**
 * Supported schema versions: v2 (PascalCase) only.
 *
 * v1 (camelCase) was retired alongside the Phase 2c storage-layer cleanup.
 * A v1 manifest in dist/ now fails the seed pass instead of silently
 * remapping — the only safe response is to rebuild with the current
 * `scripts/generate-seed-manifest.mjs`, which emits v2 unconditionally.
 */
const SUPPORTED_SCHEMA_VERSIONS = { min: 2, max: 2 };

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Seeds scripts and configs from seed-manifest.json.
 * Idempotent — upserts missing entries, refreshes stale ones.
 *
 * Returns a summary of what was seeded.
 */
// eslint-disable-next-line max-lines-per-function -- orchestrator with schema validation + per-project logging
export async function seedFromManifest(): Promise<SeedResult> {
    console.log("[manifest-seeder] Fetching seed-manifest.json from extension dist...");
    const manifest = await fetchManifest();
    if (!manifest) {
        logBgWarnError(BgLogTag.MANIFEST_SEEDER, "seed-manifest.json not found or invalid — skipping. " +
            "Ensure the build pipeline runs compile-instruction + generate-seed-manifest.");
        return { scripts: 0, configs: 0, projects: 0, errors: ["seed-manifest.json not found or invalid"] };
    }

    // Schema version validation
    const sv = manifest.SchemaVersion;
    if (typeof sv !== "number" || !Number.isFinite(sv)) {
        logBgWarnError(BgLogTag.MANIFEST_SEEDER, `Invalid schemaVersion: ${sv} — aborting seed`);
        return { scripts: 0, configs: 0, projects: 0, errors: [`Invalid schemaVersion: ${sv}`] };
    }
    if (sv > SUPPORTED_SCHEMA_VERSIONS.max) {
        logBgWarnError(BgLogTag.MANIFEST_SEEDER, `schemaVersion ${sv} is newer than supported max (${SUPPORTED_SCHEMA_VERSIONS.max}) — aborting. Update the extension.`);
        return { scripts: 0, configs: 0, projects: 0, errors: [`Unsupported schemaVersion ${sv} (max supported: ${SUPPORTED_SCHEMA_VERSIONS.max})`] };
    }
    if (sv < SUPPORTED_SCHEMA_VERSIONS.min) {
        // Hard abort: a v1 (camelCase) manifest cannot be remapped now
        // that the legacy aliases were stripped. The only safe fix is to
        // rebuild via `node scripts/generate-seed-manifest.mjs`.
        logBgWarnError(
            BgLogTag.MANIFEST_SEEDER,
            `schemaVersion ${sv} is older than min (${SUPPORTED_SCHEMA_VERSIONS.min}) — aborting. ` +
            `Rebuild seed-manifest.json with the current generator.`,
        );
        return {
            scripts: 0,
            configs: 0,
            projects: 0,
            errors: [
                `Unsupported schemaVersion ${sv} (min supported: ${SUPPORTED_SCHEMA_VERSIONS.min}). ` +
                `Rebuild seed-manifest.json — legacy camelCase manifests are no longer remapped.`,
            ],
        };
    }

    const projectNames = manifest.Projects.map((p) => `${p.Name}(${p.Scripts.length}s/${p.Configs.length}c)`);
    console.log(
        "[manifest-seeder] Processing %d project(s) from seed-manifest.json (schema v%d): [%s]",
        manifest.Projects.length,
        manifest.SchemaVersion,
        projectNames.join(", "),
    );

    // Log seedOnInstall status for each project
    for (const project of manifest.Projects) {
        console.log(
            "[manifest-seeder]   → %s: seedOnInstall=%s, scripts=%d, configs=%d, isGlobal=%s",
            project.Name,
            project.SeedOnInstall,
            project.Scripts.length,
            project.Configs.length,
            project.IsGlobal,
        );
    }

    const scriptResult = await seedScriptsFromManifest(manifest);
    const configResult = await seedConfigsFromManifest(manifest);
    const projectResult = await seedProjectsFromManifest(manifest);

    console.log(
        "[manifest-seeder] ✅ Seeded %d script(s), %d config(s), %d project(s) across %d manifest project(s). Errors: %d",
        scriptResult.seeded,
        configResult.seeded,
        projectResult.seeded,
        manifest.Projects.length,
        scriptResult.errors.length + configResult.errors.length + projectResult.errors.length,
    );

    if (scriptResult.errors.length > 0 || configResult.errors.length > 0 || projectResult.errors.length > 0) {
        logBgWarnError(BgLogTag.MANIFEST_SEEDER, `Seed errors: ${JSON.stringify([...scriptResult.errors, ...configResult.errors, ...projectResult.errors])}`);
    }

    return {
        scripts: scriptResult.seeded,
        configs: configResult.seeded,
        projects: manifest.Projects.length,
        errors: [...scriptResult.errors, ...configResult.errors, ...projectResult.errors],
    };
}

export interface SeedResult {
    scripts: number;
    configs: number;
    projects: number;
    errors: string[];
}

/* ------------------------------------------------------------------ */
/*  Manifest Fetch                                                     */
/* ------------------------------------------------------------------ */

async function fetchManifest(): Promise<SeedManifest | null> {
    let url: string;
    try {
        url = chrome.runtime.getURL(MANIFEST_PATH);
    } catch (err) {
        logCaughtError(BgLogTag.MANIFEST_SEEDER, `chrome.runtime.getURL() failed for '${MANIFEST_PATH}'`, err);
        return null;
    }
    console.log("[manifest-seeder] Fetching seed-manifest.json — relative: '%s', absolute: %s", MANIFEST_PATH, url);
    try {
        const resp = await fetch(url);
        if (!resp.ok) {
            logBgWarnError(BgLogTag.MANIFEST_SEEDER, `Fetch failed: HTTP ${resp.status} for ${url} — file does not exist in extension dist`);
            return null;
        }
        const raw = await resp.text();
        console.log("[manifest-seeder] Raw response length: %d chars", raw.length);
        const manifest = JSON.parse(raw) as SeedManifest;
        console.log("[manifest-seeder] ✅ Parsed manifest: %d projects, schema v%d, from %s",
            manifest.Projects?.length ?? 0, manifest.SchemaVersion, url);
        return manifest;
    } catch (err) {
        logCaughtError(BgLogTag.MANIFEST_SEEDER, `Fetch/parse error for ${url}`, err);
        return null;
    }
}

/* ------------------------------------------------------------------ */
/*  Script Seeding                                                     */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line max-lines-per-function, sonarjs/cognitive-complexity -- insert/refresh loop with logging
async function seedScriptsFromManifest(
    manifest: SeedManifest,
): Promise<{ seeded: number; errors: string[] }> {
    const result = await chrome.storage.local.get(STORAGE_KEY_ALL_SCRIPTS);
    const stored: StoredScript[] = Array.isArray(result[STORAGE_KEY_ALL_SCRIPTS])
        ? result[STORAGE_KEY_ALL_SCRIPTS]
        : [];

    console.log("[manifest-seeder:scripts] Store has %d existing script(s)", stored.length);

    let changed = false;
    let seeded = 0;
    const errors: string[] = [];

    for (const project of manifest.Projects) {
        if (!project.SeedOnInstall) {
            console.log("[manifest-seeder:scripts] Skipping %s (seedOnInstall=false)", project.Name);
            continue;
        }

        for (const scriptDef of project.Scripts) {
            try {
                const idx = stored.findIndex((s) => s.id === scriptDef.SeedId);

                if (idx === -1) {
                    // Insert new
                    console.log("[manifest-seeder:scripts] + INSERT %s (seedId=%s, filePath=%s)",
                        scriptDef.File, scriptDef.SeedId, scriptDef.FilePath);
                    stored.push(buildStoredScript(scriptDef, project, manifest));
                    changed = true;
                    seeded++;
                } else {
                    // Refresh if stale
                    const current = stored[idx];
                    if (isScriptStale(current, scriptDef, project, manifest)) {
                        console.log("[manifest-seeder:scripts] ↻ REFRESH %s (seedId=%s, was stale)",
                            scriptDef.File, scriptDef.SeedId);
                        stored[idx] = refreshStoredScript(current, scriptDef, project, manifest);
                        changed = true;
                        seeded++;
                    } else {
                        console.log("[manifest-seeder:scripts] = SKIP %s (seedId=%s, up-to-date)",
                            scriptDef.File, scriptDef.SeedId);
                    }
                }
            } catch (err) {
                const msg = `[seedScriptsFromManifest] Failed to seed script ${scriptDef.File} for ${project.Name}: ${err}`;
                errors.push(msg);
                logBgWarnError(BgLogTag.MANIFEST_SEEDER, msg);
            }
        }
    }

    if (changed) {
        await chrome.storage.local.set({ [STORAGE_KEY_ALL_SCRIPTS]: stored });
    }

    return { seeded, errors };
}

/**
 * Extracts target-url glob patterns from the seed project so auto-attach
 * (mem://features/auto-attach-policy.md, C2) has data to match against.
 *
 * Returns the legacy `string[]` shape (glob-only). Use `extractUrlMatchRules`
 * for the rich `UrlRule[]` shape that preserves `MatchType`.
 */
function extractUrlMatches(project: SeedProjectEntry): string[] {
    return (project.TargetUrls ?? []).map((t) => t.Pattern);
}

/**
 * Extracts target-url rules with `MatchType` preserved. Required for projects
 * like `lovable-dashboard` whose seed declares `MatchType: "exact"` —
 * collapsing those to globs causes false negatives on tabs with query
 * strings or trailing-slash differences.
 */
function extractUrlMatchRules(project: SeedProjectEntry): UrlRule[] {
    return (project.TargetUrls ?? []).map((t) => ({
        pattern: t.Pattern,
        matchType: t.MatchType,
    }));
}

function buildStoredScript(def: SeedScriptEntry, project: SeedProjectEntry, manifest: SeedManifest): StoredScript {
    const now = new Date().toISOString();
    return {
        id: def.SeedId,
        name: def.File,
        description: def.Description || project.Description,
        code: buildStubCode(def.File),
        filePath: def.FilePath,
        isAbsolute: false,
        order: def.Order,
        isEnabled: true,
        isIife: def.IsIife,
        autoInject: def.AutoInject,
        isGlobal: project.IsGlobal,
        dependencies: resolveDependencyIds(manifest, project),
        loadOrder: project.LoadOrder,
        runAt: def.RunAt,
        configBinding: resolveConfigSeedId(def.ConfigBinding, project),
        themeBinding: resolveConfigSeedId(def.ThemeBinding, project),
        cookieBinding: def.CookieBinding,
        urlMatches: extractUrlMatches(project),
        urlMatchRules: extractUrlMatchRules(project),
        createdAt: now,
        updatedAt: now,
    };
}

function refreshStoredScript(
    current: StoredScript,
    def: SeedScriptEntry,
    project: SeedProjectEntry,
    manifest: SeedManifest,
): StoredScript {
    return {
        ...current,
        name: def.File,
        description: def.Description || project.Description,
        code: buildStubCode(def.File),
        filePath: def.FilePath,
        isAbsolute: false,
        isIife: def.IsIife,
        autoInject: def.AutoInject,
        isGlobal: project.IsGlobal,
        isEnabled: current.isEnabled, // preserve user toggle
        dependencies: resolveDependencyIds(manifest, project),
        loadOrder: project.LoadOrder,
        configBinding: resolveConfigSeedId(def.ConfigBinding, project),
        themeBinding: resolveConfigSeedId(def.ThemeBinding, project),
        cookieBinding: def.CookieBinding,
        urlMatches: extractUrlMatches(project),
        urlMatchRules: extractUrlMatchRules(project),
        updatedAt: new Date().toISOString(),
    };
}

function isScriptStale(
    current: StoredScript,
    def: SeedScriptEntry,
    project: SeedProjectEntry,
    manifest: SeedManifest,
): boolean {
    return (
        current.filePath !== def.FilePath ||
        !current.code.startsWith(STUB_PREFIX) ||
        current.isGlobal !== project.IsGlobal ||
        current.loadOrder !== project.LoadOrder ||
        current.isIife !== def.IsIife ||
        current.autoInject !== def.AutoInject ||
        current.name !== def.File ||
        current.cookieBinding !== def.CookieBinding ||
        current.configBinding !== resolveConfigSeedId(def.ConfigBinding, project) ||
        current.themeBinding !== resolveConfigSeedId(def.ThemeBinding, project) ||
        JSON.stringify(current.dependencies ?? []) !== JSON.stringify(resolveDependencyIds(manifest, project)) ||
        JSON.stringify(current.urlMatches ?? []) !== JSON.stringify(extractUrlMatches(project)) ||
        JSON.stringify(current.urlMatchRules ?? []) !== JSON.stringify(extractUrlMatchRules(project))
    );
}


/* ------------------------------------------------------------------ */
/*  Config Seeding                                                     */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line max-lines-per-function, sonarjs/cognitive-complexity -- config fetch+upsert loop
async function seedConfigsFromManifest(
    manifest: SeedManifest,
): Promise<{ seeded: number; errors: string[] }> {
    const result = await chrome.storage.local.get(STORAGE_KEY_ALL_CONFIGS);
    const stored: StoredConfig[] = Array.isArray(result[STORAGE_KEY_ALL_CONFIGS])
        ? result[STORAGE_KEY_ALL_CONFIGS]
        : [];

    let changed = false;
    let seeded = 0;
    const errors: string[] = [];

    for (const project of manifest.Projects) {
        if (!project.SeedOnInstall) continue;

        for (const configDef of project.Configs) {
            try {
                // Fetch the actual JSON content from extension dist
                const configJson = await fetchConfigJson(configDef.FilePath);

                const idx = stored.findIndex((c) => c.id === configDef.SeedId);

                if (idx === -1) {
                    stored.push(buildStoredConfig(configDef, configJson));
                    changed = true;
                    seeded++;
                } else {
                    const current = stored[idx];
                    if (current.name !== configDef.File || current.json !== configJson) {
                        stored[idx] = {
                            ...current,
                            name: configDef.File,
                            json: configJson,
                            updatedAt: new Date().toISOString(),
                        };
                        changed = true;
                        seeded++;
                    }
                }
            } catch (err) {
                const msg = `[seedConfigsFromManifest→fetchConfigJson] Failed to seed config ${configDef.File} for ${project.Name}: ${err}`;
                errors.push(msg);
                // Use warn instead of error — config fetch failures are non-fatal
                // (hardcoded defaults are used) and should not inflate the error table
                logBgWarnError(BgLogTag.MANIFEST_SEEDER, msg);
            }
        }
    }

    if (changed) {
        await chrome.storage.local.set({ [STORAGE_KEY_ALL_CONFIGS]: stored });
    }

    return { seeded, errors };
}

function buildStoredConfig(def: SeedConfigEntry, json: string): StoredConfig {
    const now = new Date().toISOString();
    return {
        id: def.SeedId,
        name: def.File,
        description: def.Description,
        json,
        createdAt: now,
        updatedAt: now,
    };
}

async function fetchConfigJson(filePath: string): Promise<string> {
    const url = chrome.runtime.getURL(filePath);

    // HEFF: single attempt, fail-fast. The previous 3-attempt retry loop was
    // a direct breach of mem://constraints/no-retry-policy and
    // mem://constraints/http-error-fail-fast. Bundled-asset fetch failures
    // mean the file is missing from dist/ — retrying cannot help.
    const resp = await fetch(url);
    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} on GET ${url} — config asset missing from dist/. Loop halted.`);
    }
    const data = await resp.json();
    return JSON.stringify(data, null, 2);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Resolves a config key (e.g., "config") to its seedId within the project.
 */
function resolveConfigSeedId(
    key: string | undefined,
    project: SeedProjectEntry,
): string | undefined {
    if (!key) return undefined;
    const config = project.Configs.find((c) => c.Key === key);
    return config?.SeedId;
}

/**
 * Resolves project dependency names to their script seedIds.
 * Convention: dependency project "xpath" → seedId "default-xpath-utils" (from manifest).
 * Falls back to looking up the manifest entry for the dependency name.
 */
function resolveDependencyIds(manifest: SeedManifest, project: SeedProjectEntry): string[] {
    const resolved = new Set<string>();

    for (const dependencyName of project.Dependencies) {
        const dependencyProject = manifest.Projects.find((entry) => entry.Name === dependencyName);

        if (!dependencyProject || dependencyProject.Scripts.length === 0) {
            resolved.add(dependencyName);
            continue;
        }

        for (const dependencyScript of dependencyProject.Scripts) {
            resolved.add(dependencyScript.SeedId);
        }
    }

    return [...resolved];
}

/* ------------------------------------------------------------------ */
/*  Project Seeding (Issue 119 Step 6)                                 */
/* ------------------------------------------------------------------ */

/**
 * Creates `StoredProject` records for standalone manifest seeds so they
 * appear in the active-project list and feed into project-matcher.
 *
 * Skips `macro-controller` and `marco-sdk` — those are owned by
 * `default-project-seeder.ts` to avoid double-write conflicts.
 *
 * Idempotent: insert when missing, refresh when stale, skip when current.
 */
export async function seedProjectsFromManifest(
    manifest: SeedManifest,
): Promise<{ seeded: number; errors: string[]; migrated: number }> {
    const result = await chrome.storage.local.get(STORAGE_KEY_ALL_PROJECTS);
    const initial: StoredProject[] = Array.isArray(result[STORAGE_KEY_ALL_PROJECTS])
        ? result[STORAGE_KEY_ALL_PROJECTS]
        : [];

    // Migration guard (Issue 119 Step 7): collapse duplicate ids, drop
    // legacy slug-collisions in favour of the canonical SeedId, and bump
    // schemaVersion on stale records. Runs before upsert so the diff
    // loop sees a clean baseline.
    const canonicalIds = new Set(
        manifest.Projects
            .filter((p) => p.SeedOnInstall && !PROJECT_OWNED_BY_DEFAULT_SEEDER.has(p.Name))
            .map((p) => p.SeedId),
    );
    const canonicalSlugs = new Map(
        manifest.Projects
            .filter((p) => p.SeedOnInstall && !PROJECT_OWNED_BY_DEFAULT_SEEDER.has(p.Name))
            .map((p) => [p.Name, p.SeedId]),
    );
    const { migrated, projects: stored } = migrateLegacyProjectRecords(
        initial,
        canonicalIds,
        canonicalSlugs,
    );
    let changed = migrated > 0;
    let seeded = 0;
    const errors: string[] = [];

    for (const project of manifest.Projects) {
        if (!project.SeedOnInstall) continue;
        if (PROJECT_OWNED_BY_DEFAULT_SEEDER.has(project.Name)) continue;

        try {
            const canonical = buildStoredProjectFromSeed(project);
            const idx = stored.findIndex((p) => p.id === canonical.id);

            if (idx === -1) {
                console.log("[manifest-seeder:projects] + INSERT %s (id=%s)", project.Name, canonical.id);
                stored.push(canonical);
                changed = true;
                seeded++;
            } else if (!isStoredProjectEquivalent(stored[idx], canonical)) {
                console.log("[manifest-seeder:projects] ↻ REFRESH %s (id=%s)", project.Name, canonical.id);
                stored[idx] = {
                    ...canonical,
                    createdAt: stored[idx].createdAt,
                    settings: { ...canonical.settings, ...stored[idx].settings },
                };
                changed = true;
                seeded++;
            }
        } catch (err) {
            const msg = `[seedProjectsFromManifest] Failed to seed project ${project.Name}: ${err}`;
            errors.push(msg);
            logBgWarnError(BgLogTag.MANIFEST_SEEDER, msg);
        }
    }

    if (changed) {
        await chrome.storage.local.set({ [STORAGE_KEY_ALL_PROJECTS]: stored });
    }

    return { seeded, errors, migrated };
}

/**
 * Current StoredProject schema version for projects emitted by the manifest seeder.
 * Bump when the shape changes; legacy rows with lower values are upgraded
 * via `migrateLegacyProjectRecords` instead of being left behind.
 */
export const PROJECT_SCHEMA_VERSION = 1;

/**
 * Migration guard (Issue 119 Step 7).
 *
 * Reconciles existing storage with manifest expectations:
 *  - drops duplicate ids (keeps the first occurrence),
 *  - drops legacy records whose `slug` collides with a canonical SeedId
 *    so the upsert loop can insert the canonical row,
 *  - bumps `schemaVersion` on rows below the current version.
 */
export function migrateLegacyProjectRecords(
    projects: StoredProject[],
    canonicalIds: Set<string>,
    canonicalSlugs: Map<string, string>,
): { projects: StoredProject[]; migrated: number } {
    const seenIds = new Set<string>();
    const out: StoredProject[] = [];
    let migrated = 0;

    for (const project of projects) {
        // Drop exact-id duplicates (last-wins would lose user state — keep first).
        if (seenIds.has(project.id)) {
            console.log("[manifest-seeder:migrate] drop duplicate id=%s", project.id);
            migrated++;
            continue;
        }

        // Drop legacy slug-collision rows so the canonical SeedId can claim the slot.
        const canonicalForSlug = project.slug ? canonicalSlugs.get(project.slug) : undefined;
        const isLegacySlugCollision =
            canonicalForSlug !== undefined &&
            canonicalForSlug !== project.id &&
            !canonicalIds.has(project.id);

        if (isLegacySlugCollision) {
            console.log(
                "[manifest-seeder:migrate] drop legacy slug-collision slug=%s id=%s (canonical=%s)",
                project.slug, project.id, canonicalForSlug,
            );
            migrated++;
            continue;
        }

        seenIds.add(project.id);

        // Bump schemaVersion in place if stale.
        if ((project.schemaVersion ?? 0) < PROJECT_SCHEMA_VERSION) {
            out.push({ ...project, schemaVersion: PROJECT_SCHEMA_VERSION });
            migrated++;
        } else {
            out.push(project);
        }
    }

    return { projects: out, migrated };
}


/** Builds a canonical `StoredProject` from a manifest project entry. */
export function buildStoredProjectFromSeed(project: SeedProjectEntry): StoredProject {
    const now = new Date().toISOString();
    const targetUrls: UrlRule[] = (project.TargetUrls ?? []).map((t) => ({
        pattern: t.Pattern,
        matchType: t.MatchType,
    }));

    const scripts: ScriptEntry[] = project.Scripts.map((s) => ({
        path: s.SeedId,
        order: s.Order,
        runAt: s.RunAt,
        configBinding: s.ConfigBinding ? resolveConfigSeedId(s.ConfigBinding, project) : undefined,
        description: s.Description || project.Description,
    }));

    const configs: ConfigEntry[] = project.Configs.map((c) => ({
        path: c.SeedId,
        description: c.Description,
    }));

    return {
        id: project.SeedId,
        schemaVersion: 1,
        slug: project.Name,
        name: project.DisplayName || project.Name,
        version: project.Version,
        description: project.Description,
        targetUrls,
        scripts,
        configs,
        cookies: (project.Cookies ?? []).map((c) => ({
            cookieName: c.CookieName,
            url: c.Url,
            role: c.Role === "other" ? "custom" : c.Role,
            description: c.Description,
        })),
        settings: {
            onlyRunAsDependency: project.Settings?.OnlyRunAsDependency,
            isolateScripts: project.Settings?.IsolateScripts,
            logLevel: project.Settings?.LogLevel,
            retryOnNavigate: project.Settings?.RetryOnNavigate,
            chatBoxXPath: project.Settings?.ChatBoxXPath,
            allowDynamicRequests: project.Settings?.AllowDynamicRequests,
        },
        dependencies: project.Dependencies.map((d) => ({ projectId: d, version: "*" })),
        isGlobal: project.IsGlobal,
        isRemovable: project.IsRemovable,
        createdAt: now,
        updatedAt: now,
    };
}

/** Returns true when two stored projects are structurally equivalent (ignores timestamps). */
export function isStoredProjectEquivalent(a: StoredProject, b: StoredProject): boolean {
    return (
        a.id === b.id &&
        a.name === b.name &&
        a.version === b.version &&
        (a.description ?? "") === (b.description ?? "") &&
        JSON.stringify(a.targetUrls ?? []) === JSON.stringify(b.targetUrls ?? []) &&
        JSON.stringify(a.scripts ?? []) === JSON.stringify(b.scripts ?? []) &&
        JSON.stringify(a.configs ?? []) === JSON.stringify(b.configs ?? []) &&
        JSON.stringify(a.cookies ?? []) === JSON.stringify(b.cookies ?? []) &&
        JSON.stringify(a.dependencies ?? []) === JSON.stringify(b.dependencies ?? []) &&
        (a.isGlobal ?? false) === (b.isGlobal ?? false) &&
        (a.isRemovable ?? true) === (b.isRemovable ?? true)
    );
}
