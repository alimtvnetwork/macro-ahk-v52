/**
 * Issue 119 Step 6 — Seeder creates StoredProject records for standalone seeds.
 *
 * Locks the contract that manifest projects (e.g., `lovable-dashboard`) get
 * a StoredProject entry so they appear in the active-project list and
 * feed into project-matcher. macro-controller and marco-sdk are owned by
 * default-project-seeder and must be skipped here.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    seedProjectsFromManifest,
    buildStoredProjectFromSeed,
    isStoredProjectEquivalent,
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
        Scripts: [
            {
                SeedId: "default-lovable-dashboard",
                File: "dashboard.js",
                FilePath: "projects/scripts/lovable-dashboard/dashboard.js",
                Order: 0,
                IsIife: true,
                AutoInject: true,
                RunAt: "document_idle",
            },
        ],
        Configs: [],
        Css: [],
        Templates: [],
        Prompts: [],
        TargetUrls: [
            { Pattern: "https://lovable.dev/", MatchType: "exact" },
        ],
        Cookies: [],
        ...overrides,
    };
}

function makeManifest(projects: SeedProjectEntry[]): SeedManifest {
    return { GeneratedAt: new Date().toISOString(), SchemaVersion: 2, Projects: projects };
}

const storage = new Map<string, unknown>();

beforeEach(() => {
    storage.clear();
    globalThis.chrome = {
        storage: {
            local: {
                get: vi.fn(async (key: string) => {
                    const v = storage.get(key);
                    return v === undefined ? {} : { [key]: v };
                }),
                set: vi.fn(async (record: Record<string, unknown>) => {
                    for (const [k, v] of Object.entries(record)) storage.set(k, v);
                }),
            },
        },
        runtime: { getURL: (p: string) => `chrome-extension://test/${p}` },
    } as unknown as typeof chrome;
});

describe("buildStoredProjectFromSeed (Issue 119 Step 6)", () => {
    it("preserves UrlRule.matchType end-to-end (exact stays exact)", () => {
        const p = buildStoredProjectFromSeed(makeProject());
        expect(p.targetUrls).toEqual([
            { pattern: "https://lovable.dev/", matchType: "exact" },
        ]);
    });

    it("maps id from SeedId and name from DisplayName", () => {
        const p = buildStoredProjectFromSeed(makeProject());
        expect(p.id).toBe("default-lovable-dashboard");
        expect(p.name).toBe("Lovable Dashboard");
        expect(p.slug).toBe("lovable-dashboard");
        expect(p.version).toBe("3.21.0");
    });

    it("translates cookie role 'other' → 'custom'", () => {
        const p = buildStoredProjectFromSeed(
            makeProject({
                Cookies: [{ CookieName: "x", Url: "https://x", Role: "other", Description: "" }],
            }),
        );
        expect(p.cookies?.[0].role).toBe("custom");
    });
});

describe("seedProjectsFromManifest (Issue 119 Step 6)", () => {
    it("inserts StoredProject for lovable-dashboard on first run", async () => {
        const manifest = makeManifest([makeProject()]);
        const result = await seedProjectsFromManifest(manifest);

        expect(result.seeded).toBe(1);
        expect(result.errors).toEqual([]);

        const written = storage.get(STORAGE_KEY_ALL_PROJECTS) as StoredProject[];
        expect(written).toHaveLength(1);
        expect(written[0].id).toBe("default-lovable-dashboard");
        expect(written[0].targetUrls[0].matchType).toBe("exact");
    });

    it("skips macro-controller and marco-sdk (owned by default-project-seeder)", async () => {
        const manifest = makeManifest([
            makeProject({ Name: "macro-controller", SeedId: "default-macro-controller" }),
            makeProject({ Name: "marco-sdk", SeedId: "marco-sdk" }),
        ]);
        const result = await seedProjectsFromManifest(manifest);

        expect(result.seeded).toBe(0);
        expect(storage.get(STORAGE_KEY_ALL_PROJECTS)).toBeUndefined();
    });

    it("skips projects whose SeedOnInstall=false", async () => {
        const manifest = makeManifest([makeProject({ SeedOnInstall: false })]);
        const result = await seedProjectsFromManifest(manifest);
        expect(result.seeded).toBe(0);
    });

    it("does not duplicate when project already exists with identical shape", async () => {
        const existing = buildStoredProjectFromSeed(makeProject());
        storage.set(STORAGE_KEY_ALL_PROJECTS, [existing]);

        const result = await seedProjectsFromManifest(makeManifest([makeProject()]));
        expect(result.seeded).toBe(0);

        const written = storage.get(STORAGE_KEY_ALL_PROJECTS) as StoredProject[];
        expect(written).toHaveLength(1);
    });
});

describe("isStoredProjectEquivalent (Issue 119 Step 6)", () => {
    it("ignores createdAt/updatedAt drift", () => {
        const a = buildStoredProjectFromSeed(makeProject());
        const b = { ...a, createdAt: "2020-01-01", updatedAt: "2030-01-01" };
        expect(isStoredProjectEquivalent(a, b)).toBe(true);
    });

    it("detects targetUrls.matchType changes", () => {
        const a = buildStoredProjectFromSeed(makeProject());
        const b = buildStoredProjectFromSeed(
            makeProject({ TargetUrls: [{ Pattern: "https://lovable.dev/", MatchType: "glob" }] }),
        );
        expect(isStoredProjectEquivalent(a, b)).toBe(false);
    });
});
