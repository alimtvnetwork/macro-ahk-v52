import { describe, it, expect, beforeEach, vi } from "vitest";

const removedListeners: Array<(tabId: number) => void> = [];
const historyListeners: Array<(d: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => void> = [];

vi.stubGlobal("chrome", {
    webNavigation: {
        onHistoryStateUpdated: { addListener: (l: typeof historyListeners[number]) => historyListeners.push(l) },
    },
    tabs: {
        onRemoved: { addListener: (l: typeof removedListeners[number]) => removedListeners.push(l) },
    },
});

const scriptingExec = vi.fn(async () => [{ result: { presentIds: [], missingIds: [] } }] as chrome.scripting.InjectionResult<unknown>[]);
vi.stubGlobal("chrome", {
    ...(globalThis as { chrome: object }).chrome,
    scripting: { executeScript: scriptingExec },
});

vi.mock("../bg-logger", () => ({
    logCaughtError: vi.fn(),
    logBgWarnError: vi.fn(),
    BgLogTag: { MARCO: "MARCO" },
}));
vi.mock("../injection-diagnostics", () => ({
    persistInjectionError: vi.fn(),
    persistInjectionInfo: vi.fn(),
    persistInjectionWarn: vi.fn(),
}));
vi.mock("../handlers/project-helpers", () => ({ readAllProjects: vi.fn(async () => []) }));
vi.mock("../builtin-script-guard", () => ({ ensureBuiltinScriptsExist: vi.fn(async () => undefined) }));
vi.mock("../script-resolver", () => ({ resolveScriptBindings: vi.fn(async () => ({ resolved: [] })) }));

import {
    registerSpaReinject,
    clearSpaReinjectStateForTab,
} from "../spa-reinject";
import { setTabInjection, removeTabInjection } from "../state-manager";

function evt(tabId: number, url: string) {
    return { tabId, url, frameId: 0, processId: 0, timeStamp: 0, transitionType: "link", transitionQualifiers: [] } as unknown as chrome.webNavigation.WebNavigationTransitionCallbackDetails;
}

describe("spa-reinject U-2 burst protection", () => {
    beforeEach(() => {
        removedListeners.length = 0;
        historyListeners.length = 0;
        scriptingExec.mockClear();
        clearSpaReinjectStateForTab(7);
        removeTabInjection(7);
    });

    it("registers history listener + tab-close cleanup", () => {
        registerSpaReinject();
        expect(historyListeners.length).toBe(1);
        expect(removedListeners.length).toBe(1);
    });

    it("clearSpaReinjectStateForTab is callable for any tabId without throwing", () => {
        expect(() => clearSpaReinjectStateForTab(999)).not.toThrow();
    });

    it("dedups identical URL bursts (no extra probes)", async () => {
        registerSpaReinject();
        setTabInjection(7, {
            scriptIds: ["s1"],
            timestamp: new Date(Date.now() - 10_000).toISOString(),
            projectId: "p",
            matchedRuleId: "r",
            lastGoodBindings: [{ scriptId: "s1", world: "MAIN" }],
        } as Parameters<typeof setTabInjection>[1]);
        const handler = historyListeners[0];
        await handler(evt(7, "https://lovable.dev/projects/x?a=1"));
        const callsAfterFirst = scriptingExec.mock.calls.length;
        await handler(evt(7, "https://lovable.dev/projects/x?a=1"));
        await handler(evt(7, "https://lovable.dev/projects/x?a=1"));
        expect(scriptingExec.mock.calls.length).toBe(callsAfterFirst); // dedup'd
    });
});
