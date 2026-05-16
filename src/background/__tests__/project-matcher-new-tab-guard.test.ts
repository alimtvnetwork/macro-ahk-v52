/**
 * Verifies evaluateUrlMatches() short-circuits to [] on new-tab / blank URLs
 * before touching the project store. See mem://features/new-tab-no-url-guard.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../handlers/project-helpers", () => ({
    readAllProjects: vi.fn(async () => {
        throw new Error("readAllProjects must not be called for new-tab URLs");
    }),
}));

import { evaluateUrlMatches } from "../project-matcher";
import { readAllProjects } from "../handlers/project-helpers";

describe("evaluateUrlMatches — new-tab guard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        "",
        "about:blank",
        "chrome://newtab/",
        "chrome://new-tab-page/",
        "chrome-search://local-ntp/local-ntp.html",
        "edge://newtab/",
    ])("returns [] without reading projects for %s", async (url) => {
        const result = await evaluateUrlMatches(url);
        expect(result).toEqual([]);
        expect(readAllProjects).not.toHaveBeenCalled();
    });
});
