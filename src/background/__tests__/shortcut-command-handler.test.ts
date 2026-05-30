/**
 * Issue 126 — Ctrl+Shift+Down shortcut diagnostics regression coverage.
 *
 * Verifies that the manual-run shortcut resolver:
 *   1. Returns the active project's scripts when available (popup parity).
 *   2. Returns an empty set with a diagnostic log naming the project + URL
 *      match candidates when no active project / no scripts — never a silent
 *      abort.
 *   3. Treats invalid/missing project shapes defensively.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../message-router", () => ({
    handleMessage: vi.fn(),
}));

vi.mock("../project-matcher", () => ({
    evaluateUrlMatches: vi.fn(),
}));

vi.mock("../bg-logger", () => ({
    BgLogTag: { SHORTCUT: "[shortcut]" },
    logBgWarnError: vi.fn(),
    logCaughtError: vi.fn(),
}));

vi.mock("../recorder/recorder-session-storage", () => ({
    loadSession: vi.fn(),
    persistSession: vi.fn(),
}));

vi.mock("../recorder/recorder-store", () => ({
    recorderReducer: vi.fn(),
    IDLE_SESSION: { Phase: "Idle" },
}));

import { resolveScriptsForShortcut } from "../shortcut-command-handler";
import { handleMessage } from "../message-router";
import { evaluateUrlMatches } from "../project-matcher";

const handleMessageMock = handleMessage as unknown as ReturnType<typeof vi.fn>;
const evaluateUrlMatchesMock = evaluateUrlMatches as unknown as ReturnType<typeof vi.fn>;

function mockActiveProject(project: unknown): void {
    handleMessageMock.mockImplementation((_msg, _sender, sendResponse: (r: unknown) => void) => {
        sendResponse({ activeProject: project });
        return Promise.resolve();
    });
}

describe("resolveScriptsForShortcut (Issue 126)", () => {
    beforeEach(() => {
        handleMessageMock.mockReset();
        evaluateUrlMatchesMock.mockReset();
        evaluateUrlMatchesMock.mockResolvedValue([]);
    });

    it("returns active project's scripts when set and non-empty", async () => {
        mockActiveProject({
            id: "proj-1",
            name: "Demo",
            scripts: [{ path: "a.js", order: 1 }, { path: "b.js", order: 2 }],
        });

        const out = await resolveScriptsForShortcut("https://lovable.dev/projects/x");

        expect(out.source).toBe("active-project");
        expect(out.scripts).toHaveLength(2);
        expect(out.projectLabel).toContain("Demo");
        expect(evaluateUrlMatchesMock).not.toHaveBeenCalled();
    });

    it("returns empty set with project=none when no active project", async () => {
        mockActiveProject(null);

        const out = await resolveScriptsForShortcut("https://lovable.dev/projects/x");

        expect(out.source).toBe("none");
        expect(out.scripts).toEqual([]);
        expect(out.projectLabel).toBe("none");
        // diagnostic probe must run so the warn line can name matched candidates
        expect(evaluateUrlMatchesMock).toHaveBeenCalledWith("https://lovable.dev/projects/x");
    });

    it("returns empty set when active project exists but has zero scripts", async () => {
        mockActiveProject({ id: "p2", name: "Empty", scripts: [] });

        const out = await resolveScriptsForShortcut("https://lovable.dev/projects/x");

        expect(out.source).toBe("none");
        expect(out.scripts).toEqual([]);
        expect(out.projectLabel).toContain("Empty");
        expect(evaluateUrlMatchesMock).toHaveBeenCalled();
    });

    it("handles non-array scripts defensively", async () => {
        mockActiveProject({ id: "p3", name: "Bad", scripts: "not-an-array" });

        const out = await resolveScriptsForShortcut("https://lovable.dev/projects/x");

        expect(out.source).toBe("none");
        expect(out.scripts).toEqual([]);
    });

    it("logs URL-match candidates in the diagnostic probe without throwing if probe fails", async () => {
        mockActiveProject(null);
        evaluateUrlMatchesMock.mockRejectedValueOnce(new Error("probe boom"));

        const out = await resolveScriptsForShortcut("https://lovable.dev/projects/x");

        expect(out.source).toBe("none");
        // probe error is caught and logged — resolver still returns cleanly
        expect(out.scripts).toEqual([]);
    });
});
