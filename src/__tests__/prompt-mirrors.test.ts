import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

describe("prompt mirrors", () => {
    it("every canonical prompt in .lovable/prompt-mirrors.json has a matching mirror in .lovable/prompts/", () => {
        const script = resolve(__dirname, "../../scripts/check-prompt-mirrors.mjs");
        const result = spawnSync("node", [script], { encoding: "utf-8" });
        if (result.status !== 0) {
            // Surface the script's own report in the test failure for easy debugging.
            throw new Error(
                `check-prompt-mirrors failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`
            );
        }
        expect(result.stdout).toContain("[OK] check-prompt-mirrors");
    });
});
