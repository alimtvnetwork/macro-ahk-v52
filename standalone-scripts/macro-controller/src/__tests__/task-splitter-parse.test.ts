import { describe, expect, it } from "vitest";
import { parseSplitterSubtasks, SplitterParseError } from "../ui/task-splitter-parse";

describe("task-splitter reply parser", () => {
    it("parses N=1 strict JSON", () => {
        expect(parseSplitterSubtasks('{ "subtasks": ["Ship one fix"] }', 1)).toEqual(["Ship one fix"]);
    });

    it("parses N=10 from markdown-wrapped output", () => {
        const values = Array.from({ length: 10 }, (_value, index) => "Task " + (index + 1));
        const raw = "```json\n" + JSON.stringify({ subtasks: values }) + "\n```";

        expect(parseSplitterSubtasks(raw, 10)).toEqual(values);
    });

    it("throws JsonMissing for malformed non-JSON text", () => {
        expect(() => parseSplitterSubtasks("I split it into tasks.", 3)).toThrow(SplitterParseError);
    });

    it("throws WrongLength when assistant returns the wrong count", () => {
        expect(() => parseSplitterSubtasks('{ "subtasks": ["one", "two"] }', 3)).toThrow(/WrongLength/);
    });
});