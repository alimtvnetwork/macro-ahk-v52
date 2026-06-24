import { describe, it, expect } from "vitest";
import { getSplitterPrompt, validateSplitterN, SPLITTER_JSON_SHAPE } from "../ui/task-splitter-prompt";

describe("task-splitter prompt builder", () => {
    it("includes N=1 in directive and JSON shape", () => {
        const out = getSplitterPrompt({ rawInstruction: "Do the thing.", n: 1 });
        expect(out).toContain("EXACTLY 1 self-contained");
        expect(out).toContain("length === 1");
        expect(out).toContain(SPLITTER_JSON_SHAPE);
        expect(out).toContain("Do the thing.");
    });

    it("includes N=10 in directive", () => {
        const out = getSplitterPrompt({ rawInstruction: "Long multi-task instruction body.", n: 10 });
        expect(out).toContain("EXACTLY 10 self-contained");
        expect(out).toContain("length === 10");
    });

    it("accepts N=50 boundary", () => {
        const out = getSplitterPrompt({ rawInstruction: "x", n: 50 });
        expect(out).toContain("EXACTLY 50");
    });

    it("rejects N < 1", () => {
        expect(() => validateSplitterN(0)).toThrow(/SplitterInvalidN/);
    });

    it("rejects N > 100", () => {
        expect(() => validateSplitterN(101)).toThrow(/SplitterInvalidN/);
    });

    it("rejects non-integer N", () => {
        expect(() => validateSplitterN(3.5)).toThrow(/SplitterInvalidN/);
    });

    it("rejects empty instruction", () => {
        expect(() => getSplitterPrompt({ rawInstruction: "   ", n: 5 })).toThrow(/SplitterEmptyInstruction/);
    });
});
