/**
 * Unit tests for backfillScriptUrlMatches — P2 backfill for user-imported scripts.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { backfillScriptUrlMatches } from "../url-matches-backfill";

interface FakeStore {
    marco_scripts?: unknown;
    marco_projects?: unknown;
}

function installChromeStub(initial: FakeStore): FakeStore {
    const store: FakeStore = { ...initial };
    (globalThis as unknown as { chrome: unknown }).chrome = {
        storage: {
            local: {
                get: vi.fn(async (key: string) => ({ [key]: (store as Record<string, unknown>)[key] })),
                set: vi.fn(async (patch: Record<string, unknown>) => {
                    Object.assign(store, patch);
                }),
            },
        },
    };
    return store;
}

describe("backfillScriptUrlMatches", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("populates urlMatches from project.targetUrls when missing", async () => {
        const store = installChromeStub({
            marco_scripts: [
                { id: "s1", name: "macro-looping.js", code: "", order: 0, isEnabled: true, createdAt: "", updatedAt: "" },
            ],
            marco_projects: [
                {
                    id: "p1", schemaVersion: 1, name: "P", version: "1",
                    targetUrls: [{ pattern: "https://example.com/*", matchType: "glob" }],
                    scripts: [{ path: "macro-looping.js", order: 0 }],
                    createdAt: "", updatedAt: "",
                },
            ],
        });

        const r = await backfillScriptUrlMatches();
        expect(r.updated).toBe(1);
        const out = (store.marco_scripts as Array<{ urlMatches?: string[] }>)[0];
        expect(out.urlMatches).toEqual(["https://example.com/*"]);
    });

    it("skips scripts that already have urlMatches", async () => {
        installChromeStub({
            marco_scripts: [
                { id: "s1", name: "a.js", code: "", order: 0, isEnabled: true, createdAt: "", updatedAt: "", urlMatches: ["https://x/*"] },
            ],
            marco_projects: [],
        });
        const r = await backfillScriptUrlMatches();
        expect(r.updated).toBe(0);
        expect(r.skippedAlreadyPopulated).toBe(1);
    });

    it("records skippedNoBindingFound when no project binds the script", async () => {
        installChromeStub({
            marco_scripts: [
                { id: "s1", name: "orphan.js", code: "", order: 0, isEnabled: true, createdAt: "", updatedAt: "" },
            ],
            marco_projects: [
                {
                    id: "p1", schemaVersion: 1, name: "P", version: "1",
                    targetUrls: [{ pattern: "https://example.com/*", matchType: "glob" }],
                    scripts: [{ path: "other.js", order: 0 }],
                    createdAt: "", updatedAt: "",
                },
            ],
        });
        const r = await backfillScriptUrlMatches();
        expect(r.updated).toBe(0);
        expect(r.skippedNoBindingFound).toBe(1);
    });

    it("unions patterns across multiple binding projects", async () => {
        const store = installChromeStub({
            marco_scripts: [
                { id: "s1", name: "shared.js", code: "", order: 0, isEnabled: true, createdAt: "", updatedAt: "" },
            ],
            marco_projects: [
                {
                    id: "p1", schemaVersion: 1, name: "A", version: "1",
                    targetUrls: [{ pattern: "https://a.com/*", matchType: "glob" }],
                    scripts: [{ path: "shared.js", order: 0 }],
                    createdAt: "", updatedAt: "",
                },
                {
                    id: "p2", schemaVersion: 1, name: "B", version: "1",
                    targetUrls: [{ pattern: "https://b.com/*", matchType: "glob" }],
                    scripts: [{ path: "shared.js", order: 0 }],
                    createdAt: "", updatedAt: "",
                },
            ],
        });
        const r = await backfillScriptUrlMatches();
        expect(r.updated).toBe(1);
        const out = (store.marco_scripts as Array<{ urlMatches?: string[] }>)[0];
        expect(out.urlMatches?.sort()).toEqual(["https://a.com/*", "https://b.com/*"]);
    });
});
