import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    dismissOriginForTab,
    isOriginDismissedForTab,
    clearDismissedOriginsForTab,
    persistDismissOrigin,
    unpersistDismissOrigin,
    listPersistedDismissedOrigins,
    preloadDismissedOrigins,
    _resetDismissedOriginsForTests,
    STORAGE_KEY_DISMISSED_ORIGINS,
} from "../dismissed-origins";

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

describe("dismissed-origins", () => {
    beforeEach(() => {
        _resetDismissedOriginsForTests();
        installChromeStorageStub();
    });

    it("ignores unparseable URLs", () => {
        dismissOriginForTab(1, "not-a-url");
        expect(isOriginDismissedForTab(1, "not-a-url")).toBe(false);
    });

    it("dismisses an origin per-tab and isolates tabs", () => {
        dismissOriginForTab(1, "https://app.example.com/page");
        expect(isOriginDismissedForTab(1, "https://app.example.com/other")).toBe(true);
        expect(isOriginDismissedForTab(2, "https://app.example.com/other")).toBe(false);
    });

    it("does NOT cross origins on the same tab", () => {
        dismissOriginForTab(1, "https://a.example.com/");
        expect(isOriginDismissedForTab(1, "https://b.example.com/")).toBe(false);
    });

    it("clears tab state on demand", () => {
        dismissOriginForTab(1, "https://a.example.com/");
        clearDismissedOriginsForTab(1);
        expect(isOriginDismissedForTab(1, "https://a.example.com/")).toBe(false);
    });

    it("persistDismissOrigin writes to chrome.storage.local and applies across tabs", async () => {
        const store = installChromeStorageStub();
        _resetDismissedOriginsForTests();
        await persistDismissOrigin("https://app.example.com/page");
        const persisted = store[STORAGE_KEY_DISMISSED_ORIGINS];
        expect(persisted).toEqual(["https://app.example.com"]);
        // Different tab, same origin → still dismissed because it's persisted
        expect(isOriginDismissedForTab(42, "https://app.example.com/anything")).toBe(true);
    });

    it("unpersistDismissOrigin removes the origin from persistence", async () => {
        const store = installChromeStorageStub();
        _resetDismissedOriginsForTests();
        await persistDismissOrigin("https://a.example.com/");
        await persistDismissOrigin("https://b.example.com/");
        await unpersistDismissOrigin("https://a.example.com/");
        expect(store[STORAGE_KEY_DISMISSED_ORIGINS]).toEqual(["https://b.example.com"]);
        expect(isOriginDismissedForTab(1, "https://a.example.com/")).toBe(false);
        expect(isOriginDismissedForTab(1, "https://b.example.com/")).toBe(true);
    });

    it("hydrates persistent state from storage on preload", async () => {
        installChromeStorageStub({
            [STORAGE_KEY_DISMISSED_ORIGINS]: ["https://seeded.example.com"],
        });
        _resetDismissedOriginsForTests();
        await preloadDismissedOrigins();
        expect(isOriginDismissedForTab(99, "https://seeded.example.com/path")).toBe(true);
    });

    it("listPersistedDismissedOrigins returns a sorted snapshot", async () => {
        installChromeStorageStub();
        _resetDismissedOriginsForTests();
        await persistDismissOrigin("https://zebra.example.com/");
        await persistDismissOrigin("https://apple.example.com/");
        expect(await listPersistedDismissedOrigins()).toEqual([
            "https://apple.example.com",
            "https://zebra.example.com",
        ]);
    });
});
