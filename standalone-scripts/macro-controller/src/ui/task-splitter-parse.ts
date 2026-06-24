/**
 * Task Splitter reply parser.
 *
 * Accepts the assistant's reply text, extracts strict JSON object candidates,
 * and validates `{ "subtasks": string[] }` has exactly the requested length.
 */

export type SplitterParseReason =
    | "JsonMissing"
    | "JsonParseFailed"
    | "SubtasksMissing"
    | "WrongLength"
    | "SubtaskInvalid";

export interface SplitterParseFailure {
    readonly Reason: SplitterParseReason;
    readonly ReasonDetail: string;
    readonly ExpectedN: number;
    readonly ReceivedN: number;
    readonly RawSample: string;
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };
type JsonObject = { readonly [key: string]: JsonValue };

const RAW_SAMPLE_MAX = 240;

export class SplitterParseError extends Error {
    readonly failure: SplitterParseFailure;

    constructor(failure: SplitterParseFailure) {
        super("TaskSplitter.parse " + failure.Reason + ": " + failure.ReasonDetail);
        this.name = "SplitterParseError";
        this.failure = failure;
    }
}

function sample(raw: string): string {
    return raw.replace(/\s+/g, " ").trim().slice(0, RAW_SAMPLE_MAX);
}

function fail(raw: string, reason: SplitterParseReason, detail: string, expectedN: number, receivedN: number): never {
    throw new SplitterParseError({
        Reason: reason,
        ReasonDetail: detail,
        ExpectedN: expectedN,
        ReceivedN: receivedN,
        RawSample: sample(raw),
    });
}

function isJsonObject(value: JsonValue): value is JsonObject {
    const isObject = typeof value === "object" && value !== null;

    return isObject && Array.isArray(value) === false;
}

function validateSubtasks(raw: string, candidate: string, expectedN: number): string[] {
    const parsed = JSON.parse(candidate) as JsonValue;
    if (!isJsonObject(parsed)) {
        fail(raw, "SubtasksMissing", "Top-level JSON value is not an object", expectedN, 0);
    }

    const subtasks = parsed.subtasks;
    if (Array.isArray(subtasks) === false) {
        fail(raw, "SubtasksMissing", "JSON object does not contain a subtasks array", expectedN, 0);
    }

    return normalizeSubtasks(raw, subtasks, expectedN);
}

function normalizeSubtasks(raw: string, values: JsonValue[], expectedN: number): string[] {
    const texts = values.filter((value): value is string => typeof value === "string").map((value) => value.trim());
    const hasInvalidItem = texts.length !== values.length || texts.some((value) => value.length === 0);
    if (hasInvalidItem) {
        fail(raw, "SubtaskInvalid", "Every subtask must be a non-empty string", expectedN, texts.length);
    }
    if (texts.length !== expectedN) {
        fail(raw, "WrongLength", "Subtasks length does not match expected N", expectedN, texts.length);
    }

    return texts;
}

function collectJsonObjects(raw: string): string[] {
    const objects: string[] = [];
    let start = -1;
    let depth = 0;
    let isString = false;
    let isEscaped = false;
    for (let index = 0; index < raw.length; index++) {
        const char = raw[index];
        const token = scanJsonChar(char, { start, depth, isString, isEscaped }, objects, raw, index);
        start = token.start;
        depth = token.depth;
        isString = token.isString;
        isEscaped = token.isEscaped;
    }

    return objects;
}

interface JsonScanState {
    readonly start: number;
    readonly depth: number;
    readonly isString: boolean;
    readonly isEscaped: boolean;
}

function scanJsonChar(char: string, state: JsonScanState, objects: string[], raw: string, index: number): JsonScanState {
    if (state.isEscaped) {
        return { ...state, isEscaped: false };
    }
    if (char === "\\" && state.isString) {
        return { ...state, isEscaped: true };
    }
    if (char === "\"") {
        return { ...state, isString: state.isString === false };
    }
    if (state.isString) {
        return state;
    }

    return scanJsonStructure(char, state, objects, raw, index);
}

function scanJsonStructure(char: string, state: JsonScanState, objects: string[], raw: string, index: number): JsonScanState {
    if (char === "{") {
        const nextStart = state.depth === 0 ? index : state.start;

        return { ...state, start: nextStart, depth: state.depth + 1 };
    }
    if (char !== "}" || state.depth === 0) {
        return state;
    }

    return closeJsonObject(state, objects, raw, index);
}

function closeJsonObject(state: JsonScanState, objects: string[], raw: string, index: number): JsonScanState {
    const depth = state.depth - 1;
    if (depth !== 0) {
        return { ...state, depth };
    }
    objects.push(raw.slice(state.start, index + 1));

    return { ...state, start: -1, depth };
}

export function parseSplitterSubtasks(rawReply: string, expectedN: number): string[] {
    const candidates = collectJsonObjects(rawReply);
    if (candidates.length === 0) {
        fail(rawReply, "JsonMissing", "No JSON object found in assistant reply", expectedN, 0);
    }
    for (const candidate of candidates.reverse()) {
        try {
            return validateSubtasks(rawReply, candidate, expectedN);
        } catch (caught: CaughtError) {
            if (caught instanceof SplitterParseError) {
                throw caught;
            }
        }
    }

    fail(rawReply, "JsonParseFailed", "No JSON object candidate parsed successfully", expectedN, 0);
}