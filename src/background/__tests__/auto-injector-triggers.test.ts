import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock chrome global before importing modules under test.
const navListeners: Array<(d: chrome.webNavigation.WebNavigationFramedCallbackDetails) => void> = [];
const activatedListeners: Array<(info: chrome.tabs.TabActiveInfo) => void> = [];
const removedListeners: Array<(tabId: number) => void> = [];
const tabUrlByTabId = new Map<number, string>();

vi.stubGlobal("chrome", {
    webNavigation: {
        onCompleted: { addListener: (l: typeof navListeners[number]) => navListeners.push(l) },
    },
    tabs: {
        onActivated: { addListener: (l: typeof activatedListeners[number]) => activatedListeners.push(l) },
        onRemoved: { addListener: (l: typeof removedListeners[number]) => removedListeners.push(l) },
        get: (tabId: number) => Promise.resolve({ url: tabUrlByTabId.get(tabId) ?? "" } as chrome.tabs.Tab),
    },
    storage: { local: { get: () => Promise.resolve({}) } },
});

vi.mock("../project-matcher", () => ({
    evaluateUrlMatches: vi.fn(async () => []),
    deduplicateScripts: vi.fn(() => []),
}));
vi.mock("../bg-logger", () => ({
    logCaughtError: vi.fn(),
    logBgWarnError: vi.fn(),
    BgLogTag: { MARCO: "MARCO" },
}));
vi.mock("../injection-diagnostics", () => ({
    persistInjectionError: vi.fn(),
    persistInjectionWarn: vi.fn(),
}));

import { registerAutoInjector, handleNavigationCompleted, handleTabActivated } from "../auto-injector";
import * as matcher from "../project-matcher";
import { getTabDecision, clearTabDecision } from "../state-manager";

const PROJECT_URL = "https://lovable.dev/projects/abc";

function navDetails(tabId: number, url: string) {
    return { tabId, url, frameId: 0, processId: 0, timeStamp: 0 } as chrome.webNavigation.WebNavigationFramedCallbackDetails;
}

describe("auto-injector triggers (U-1/U-3)", () => {
    beforeEach(() => {
        navListeners.length = 0;
        activatedListeners.length = 0;
        removedListeners.length = 0;
        tabUrlByTabId.clear();
        clearTabDecision(1);
        clearTabDecision(2);
        vi.mocked(matcher.evaluateUrlMatches).mockClear();
    });

    it("registers webNavigation + tabs.onActivated + tabs.onRemoved", () => {
        registerAutoInjector();
        expect(navListeners.length).toBe(1);
        expect(activatedListeners.length).toBe(1);
        expect(removedListeners.length).toBe(1);
    });

    it("caches decision and dedups burst onCompleted within TTL", async () => {
        await handleNavigationCompleted(navDetails(1, PROJECT_URL));
        await handleNavigationCompleted(navDetails(1, PROJECT_URL));
        expect(matcher.evaluateUrlMatches).toHaveBeenCalledTimes(1);
        expect(getTabDecision(1)?.urlFp).toContain("/projects/abc");
    });

    it("T3 activation skips when fingerprint matches cache", async () => {
        await handleNavigationCompleted(navDetails(1, PROJECT_URL));
        vi.mocked(matcher.evaluateUrlMatches).mockClear();
        tabUrlByTabId.set(1, PROJECT_URL);
        await handleTabActivated(1);
        expect(matcher.evaluateUrlMatches).not.toHaveBeenCalled();
    });

    it("T3 activation re-evaluates when URL changes", async () => {
        await handleNavigationCompleted(navDetails(1, PROJECT_URL));
        vi.mocked(matcher.evaluateUrlMatches).mockClear();
        tabUrlByTabId.set(1, "https://lovable.dev/projects/different");
        await handleTabActivated(1);
        expect(matcher.evaluateUrlMatches).toHaveBeenCalledTimes(1);
    });

    it("T3 skips new-tab / blank URLs", async () => {
        tabUrlByTabId.set(2, "chrome://newtab/");
        await handleTabActivated(2);
        expect(matcher.evaluateUrlMatches).not.toHaveBeenCalled();
    });

    it("tabs.onRemoved listener clears the decision cache", async () => {
        await handleNavigationCompleted(navDetails(1, PROJECT_URL));
        expect(getTabDecision(1)).toBeDefined();
        registerAutoInjector();
        removedListeners[0](1);
        expect(getTabDecision(1)).toBeUndefined();
    });
});
