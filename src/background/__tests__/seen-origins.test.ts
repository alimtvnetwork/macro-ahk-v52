import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    isOriginSeen,
    markOriginSeen,
    preloadSeenOrigins,
    _resetSeenOriginsForTests,
    STORAGE_KEY_SEEN_ORIGINS,
} from "../seen-origins";

type StorageMap = Record<string, unknown>;

function installChromeStorageStub(initial: StorageMap = {}): StorageMap {
    const store: StorageMap = { ...initial };
    (globalThis as unknown as { chrome: unknown }).chrome = {
        storage: {
            local: {
                get: vi.fn(async (key: string) => {
                    return key in store ? { [key]: store[key] } : {};
                }),
                set: vi.fn(async (patch: StorageMap) => {
                    Object.assign(store, patch);
                }),
            },
        },
        runtime: { lastError: null },
    };
    return store;
}

describe("seen-origins", () => {
    beforeEach(() => {
        _resetSeenOriginsForTests();
        installChromeStorageStub();
    });

    it("treats unparseable URLs as seen (skip toast)", () => {
        expect(isOriginSeen("not-a-url")).toBe(true);
    });

    it("returns false for unseen origins after preload", async () => {
        await preloadSeenOrigins();
        expect(isOriginSeen("https://app.example.com/x")).toBe(false);
    });

    it("markOriginSeen persists and flips isOriginSeen to true", async () => {
        const added = await markOriginSeen("https://app.example.com/x");
        expect(added).toBe(true);
        expect(isOriginSeen("https://app.example.com/other")).toBe(true);
    });

    it("markOriginSeen is idempotent and returns false on repeat", async () => {
        await markOriginSeen("https://app.example.com/x");
        const again = await markOriginSeen("https://app.example.com/y");
        expect(again).toBe(false);
    });

    it("hydrates from existing storage seed", async () => {
        _resetSeenOriginsForTests();
        installChromeStorageStub({
            [STORAGE_KEY_SEEN_ORIGINS]: ["https://seeded.example.com"],
        });
        await preloadSeenOrigins();
        expect(isOriginSeen("https://seeded.example.com/any")).toBe(true);
        expect(isOriginSeen("https://other.example.com/any")).toBe(false);
    });

    it("ignores non-string entries in seed", async () => {
        _resetSeenOriginsForTests();
        installChromeStorageStub({
            [STORAGE_KEY_SEEN_ORIGINS]: ["https://ok.example.com", 42, null, ""],
        });
        await preloadSeenOrigins();
        expect(isOriginSeen("https://ok.example.com")).toBe(true);
    });

    it("isolates origins (port/protocol)", async () => {
        await markOriginSeen("https://app.example.com");
        expect(isOriginSeen("http://app.example.com")).toBe(false);
        expect(isOriginSeen("https://app.example.com:8443")).toBe(false);
    });

    it("writes serialized array to chrome.storage.local", async () => {
        const store = installChromeStorageStub();
        await markOriginSeen("https://a.example.com");
        await markOriginSeen("https://b.example.com");
        const stored = store[STORAGE_KEY_SEEN_ORIGINS];
        expect(Array.isArray(stored)).toBe(true);
        expect(stored).toContain("https://a.example.com");
        expect(stored).toContain("https://b.example.com");
    });
});
