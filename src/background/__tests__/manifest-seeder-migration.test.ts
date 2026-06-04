/**
 * Issue 119 Step 7 — Seeder idempotency + migration guard.
 *
 * Locks the contract that:
 *  - repeat calls with identical manifest+storage produce zero writes,
 *  - duplicate-id rows are collapsed,
 *  - legacy slug-collision rows are dropped so the canonical SeedId can claim them,
 *  - stale `schemaVersion` rows are upgraded in place.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import {
    seedProjectsFromManifest,
    buildStoredProjectFromSeed,
    migrateLegacyProjectRecords,
    PROJECT_SCHEMA_VERSION,
} from "../manifest-seeder";
import type { SeedManifest, SeedProjectEntry } from "../../shared/seed-manifest-types";
import type { StoredProject } from "../../shared/project-types";
import { STORAGE_KEY_ALL_PROJECTS } from "../../shared/constants";

function makeProject(overrides: Partial<SeedProjectEntry> = {}): SeedProjectEntry {
    return {
        Name: "lovable-dashboard",
        DisplayName: "Lovable Dashboard",
        Version: "3.21.0",
        Description: "Dashboard plugin",
        SeedId: "default-lovable-dashboard",
        SeedOnInstall: true,
        World: "MAIN",
        LoadOrder: 40,
        IsGlobal: false,
        IsRemovable: false,
        Dependencies: [],
        Scripts: [{
            SeedId: "default-lovable-dashboard",
            File: "dashboard.js",
            FilePath: "projects/scripts/lovable-dashboard/dashboard.js",
            Order: 0,
            IsIife: true,
            AutoInject: true,
            RunAt: "document_idle",
        }],
        Configs: [],
        Css: [],
        Templates: [],
        Prompts: [],
        TargetUrls: [{ Pattern: "https://lovable.dev/", MatchType: "exact" }],
        Cookies: [],
        ...overrides,
    };
}

function makeManifest(projects: SeedProjectEntry[]): SeedManifest {
    return { GeneratedAt: new Date().toISOString(), SchemaVersion: 2, Projects: projects };
}

const storage = new Map<string, unknown>();
let setSpy: Mock;

beforeEach(() => {
    storage.clear();
    setSpy = vi.fn(async (record: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(record)) storage.set(k, v);
    });
    globalThis.chrome = {
        storage: {
            local: {
                get: vi.fn(async (key: string) => {
                    const v = storage.get(key);
                    return v === undefined ? {} : { [key]: v };
                }),
                set: setSpy,
            },
        },
        runtime: { getURL: (p: string) => `chrome-extension://test/${p}` },
    } as unknown as typeof chrome;
});

describe("seedProjectsFromManifest — idempotency (Issue 119 Step 7)", () => {
    it("second call with identical manifest performs zero writes", async () => {
        const manifest = makeManifest([makeProject()]);
        await seedProjectsFromManifest(manifest); // first run writes
        setSpy.mockClear();

        const result = await seedProjectsFromManifest(manifest);
        expect(result.seeded).toBe(0);
        expect(result.migrated).toBe(0);
        expect(setSpy).not.toHaveBeenCalled();
    });

    it("repeated calls never grow the project list", async () => {
        const manifest = makeManifest([makeProject()]);
        for (let i = 0; i < 5; i++) await seedProjectsFromManifest(manifest);
        const stored = storage.get(STORAGE_KEY_ALL_PROJECTS) as StoredProject[];
        expect(stored).toHaveLength(1);
    });
});

describe("migrateLegacyProjectRecords (Issue 119 Step 7)", () => {
    const canonicalIds = new Set(["default-lovable-dashboard"]);
    const canonicalSlugs = new Map([["lovable-dashboard", "default-lovable-dashboard"]]);

    it("drops duplicate ids (keeps first occurrence)", () => {
        const a = buildStoredProjectFromSeed(makeProject());
        const b = { ...a, name: "Duplicate" };
        const { projects, migrated } = migrateLegacyProjectRecords([a, b], canonicalIds, canonicalSlugs);
        expect(projects).toHaveLength(1);
        expect(projects[0].name).toBe("Lovable Dashboard");
        expect(migrated).toBe(1);
    });

    it("drops legacy slug-collision row so canonical SeedId can claim the slot", () => {
        const legacy: StoredProject = {
            ...buildStoredProjectFromSeed(makeProject()),
            id: "legacy-uuid-xyz", // wrong id, but same slug
        };
        const { projects, migrated } = migrateLegacyProjectRecords([legacy], canonicalIds, canonicalSlugs);
        expect(projects).toHaveLength(0);
        expect(migrated).toBe(1);
    });

    it("bumps stale schemaVersion in place", () => {
        const stale: StoredProject = {
            ...buildStoredProjectFromSeed(makeProject()),
            schemaVersion: 0,
        };
        const { projects, migrated } = migrateLegacyProjectRecords([stale], canonicalIds, canonicalSlugs);
        expect(projects[0].schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
        expect(migrated).toBe(1);
    });

    it("leaves unrelated user projects untouched", () => {
        const userProject: StoredProject = {
            ...buildStoredProjectFromSeed(makeProject()),
            id: "user-custom-id",
            slug: "my-custom-project",
            schemaVersion: PROJECT_SCHEMA_VERSION,
        };
        const { projects, migrated } = migrateLegacyProjectRecords([userProject], canonicalIds, canonicalSlugs);
        expect(projects).toEqual([userProject]);
        expect(migrated).toBe(0);
    });

    it("end-to-end: legacy collision dropped, then canonical inserted by seeder", async () => {
        const legacy: StoredProject = {
            ...buildStoredProjectFromSeed(makeProject()),
            id: "legacy-uuid-xyz",
            schemaVersion: 0,
        };
        storage.set(STORAGE_KEY_ALL_PROJECTS, [legacy]);

        const result = await seedProjectsFromManifest(makeManifest([makeProject()]));
        expect(result.migrated).toBe(1);
        expect(result.seeded).toBe(1);

        const stored = storage.get(STORAGE_KEY_ALL_PROJECTS) as StoredProject[];
        expect(stored).toHaveLength(1);
        expect(stored[0].id).toBe("default-lovable-dashboard");
        expect(stored[0].schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    });
});
