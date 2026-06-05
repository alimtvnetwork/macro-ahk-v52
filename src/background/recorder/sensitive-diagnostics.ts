import type { JsonValue } from "../handlers/handler-types";

export const SENSITIVE_VARIABLE_PATTERNS: ReadonlyArray<RegExp> = [
    /password/i,
    /\bpwd\b/i,
    /token/i,
    /bearer/i,
    /secret/i,
    /api[-_]?key/i,
    /authorization/i,
    /cookie/i,
    /\botp\b/i,
    /\bpin\b/i,
    /\bssn\b/i,
    /\bcvv\b/i,
    /card/i,
];

export function isSensitiveDiagnosticName(name: string): boolean {
    return SENSITIVE_VARIABLE_PATTERNS.some((pattern) => pattern.test(name));
}

export function maskDiagnosticValue(value: JsonValue | undefined): string {
    return `***masked(len=${diagnosticValueLength(value)})***`;
}

function diagnosticValueLength(value: JsonValue | undefined): number {
    if (value === undefined) {
        return 0;
    }
    if (typeof value === "string") {
        return value.length;
    }
    const text = safeJsonStringify(value);
    return text.length;
}

function safeJsonStringify(value: JsonValue): string {
    try {
        return JSON.stringify(value) ?? "null";
    } catch {
        return "[unserializable]";
    }
}