/**
 * Issue 119 Step 8 — Auto-injection regression test for `lovable-dashboard`.
 *
 * End-to-end: manifest → seeder writes StoredProject → project-matcher
 * returns the lovable-dashboard match for the exact dashboard URL and
 * rejects subpaths / wrong hosts.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { seedProjectsFromManifest } from "../manifest-seeder";
import { evaluateUrlMatches } from "../project-matcher";
import type { SeedManifest } from "../../shared/seed-manifest-types";

const DASHBOARD_URL = "https://lovable.dev/dashboard";

function manifest(): SeedManifest {
    return {
        GeneratedAt: new Date().toISOString(),
        SchemaVersion: 2,
        Projects: [{
            Name: "lovable-dashboard",
            DisplayName: "Lovable Dashboard",
            Version: "3.31.0",
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
                File: "lovable-dashboard.js",
                FilePath: "projects/scripts/lovable-dashboard/lovable-dashboard.js",
                Order: 1,
                IsIife: true,
                AutoInject: true,
                RunAt: "document_idle",
            }],
            Configs: [],
            Css: [],
            Templates: [],
            Prompts: [],
            TargetUrls: [{ Pattern: DASHBOARD_URL, MatchType: "exact" }],
            Cookies: [],
        }],
    };
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
                set: vi.fn(async (obj: Record<string, unknown>) => {
                    for (const [k, v] of Object.entries(obj)) storage.set(k, v);
                }),
            },
        },
        runtime: { getURL: (p: string) => `chrome-extension://test/${p}` },
    } as unknown as typeof chrome;
});

describe("Auto-injection regression — lovable-dashboard (Issue 119 Step 8)", () => {
    it("seeded project matches the exact dashboard URL", async () => {
        await seedProjectsFromManifest(manifest());
        const matches = await evaluateUrlMatches(DASHBOARD_URL);

        expect(matches).toHaveLength(1);
        expect(matches[0].projectId).toBe("default-lovable-dashboard");
        expect(matches[0].projectName).toBe("Lovable Dashboard");
        expect(matches[0].scriptBindings).toHaveLength(1);
    });

    it("matches the dashboard URL even with query string + fragment (exact strips them)", async () => {
        await seedProjectsFromManifest(manifest());
        const matches = await evaluateUrlMatches(`${DASHBOARD_URL}?foo=1#bar`);
        expect(matches).toHaveLength(1);
    });

    it("does NOT match a subpath like /dashboard/settings", async () => {
        await seedProjectsFromManifest(manifest());
        const matches = await evaluateUrlMatches("https://lovable.dev/dashboard/settings");
        expect(matches).toHaveLength(0);
    });

    it("does NOT match a different host", async () => {
        await seedProjectsFromManifest(manifest());
        const matches = await evaluateUrlMatches("https://other.dev/dashboard");
        expect(matches).toHaveLength(0);
    });

    it("does NOT match on new-tab / blank URLs (new-tab guard)", async () => {
        await seedProjectsFromManifest(manifest());
        for (const url of ["about:blank", "chrome://newtab/", ""]) {
            const matches = await evaluateUrlMatches(url);
            expect(matches).toHaveLength(0);
        }
    });

    it("script binding carries runAt=document_idle from the seed", async () => {
        await seedProjectsFromManifest(manifest());
        const matches = await evaluateUrlMatches(DASHBOARD_URL);
        expect(matches[0].scriptBindings[0].runAt).toBe("document_idle");
    });
});
