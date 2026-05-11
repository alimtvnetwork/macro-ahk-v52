/**
 * Marco Extension — Recorder Export helpers
 *
 * Pure, dependency-free serializers that turn the visualisation panel's
 * in-memory `RecorderProjectData` into downloadable JSON / CSV blobs.
 *
 * Triggers a browser download via an anchor click — no chrome.* API needed,
 * so this works in both extension and preview contexts.
 */

import type {
    RecorderProjectData,
    StepRow,
    FieldBindingRow,
    DataSourceRow,
} from "@/hooks/use-recorder-project-data";

export type ExportFormat = "json" | "csv";

interface ExportOptions {
    readonly projectSlug: string;
    readonly data: RecorderProjectData;
    readonly tagsByStep: ReadonlyMap<number, ReadonlyArray<string>>;
}

/* ------------------------------------------------------------------ */
/*  JSON                                                               */
/* ------------------------------------------------------------------ */

export function buildJsonExport(opts: ExportOptions): string {
    const payload = {
        SchemaVersion: 1,
        ProjectSlug: opts.projectSlug,
        ExportedAt: new Date().toISOString(),
        Steps: opts.data.steps.map((s) => ({
            ...s,
            Tags: opts.tagsByStep.get(s.StepId) ?? [],
            FieldBindings: opts.data.bindings
                .filter((b) => b.StepId === s.StepId)
                .map((b) => ({
                    DataSourceId: b.DataSourceId,
                    ColumnName: b.ColumnName,
                })),
        })),
        DataSources: opts.data.dataSources,
    };
    return JSON.stringify(payload, null, 2);
}

/* ------------------------------------------------------------------ */
/*  CSV                                                                */
/* ------------------------------------------------------------------ */

const CSV_HEADERS: ReadonlyArray<keyof StepRow | "Tags" | "Bindings"> = [
    "OrderIndex",
    "StepId",
    "StepKindId",
    "StepStatusId",
    "VariableName",
    "Label",
    "Description",
    "IsBreakpoint",
    "IsDisabled",
    "RetryCount",
    "TimeoutMs",
    "OnSuccessProjectId",
    "OnFailureProjectId",
    "InlineJs",
    "CapturedAt",
    "UpdatedAt",
    "Tags",
    "Bindings",
];

function csvEscape(value: string | number | null): string {
    if (value === null || value === undefined) { return ""; }
    const s = String(value);
    if (/[",\r\n]/.test(s)) { return `"${s.replace(/"/g, '""')}"`; }
    return s;
}

function bindingsForStep(
    stepId: number,
    bindings: ReadonlyArray<FieldBindingRow>,
    sources: ReadonlyArray<DataSourceRow>,
): string {
    return bindings
        .filter((b) => b.StepId === stepId)
        .map((b) => {
            const src = sources.find((d) => d.DataSourceId === b.DataSourceId);
            const fileLabel = src?.FilePath ?? `ds#${b.DataSourceId}`;
            return `${fileLabel}.${b.ColumnName}`;
        })
        .join(" | ");
}

export function buildCsvExport(opts: ExportOptions): string {
    const lines: string[] = [];
    lines.push(CSV_HEADERS.join(","));
    for (const step of opts.data.steps) {
        const tags = (opts.tagsByStep.get(step.StepId) ?? []).join(" | ");
        const bindings = bindingsForStep(step.StepId, opts.data.bindings, opts.data.dataSources);
        const row = CSV_HEADERS.map((key) => {
            if (key === "Tags") { return csvEscape(tags); }
            if (key === "Bindings") { return csvEscape(bindings); }
            const v = step[key as keyof StepRow];
            if (typeof v === "string" || typeof v === "number" || v === null) {
                return csvEscape(v);
            }
            return csvEscape(String(v));
        });
        lines.push(row.join(","));
    }
    return lines.join("\r\n");
}

/* ------------------------------------------------------------------ */
/*  Download trigger                                                   */
/* ------------------------------------------------------------------ */

export function downloadRecorderExport(opts: ExportOptions, format: ExportFormat): void {
    const isJson = format === "json";
    const content = isJson ? buildJsonExport(opts) : buildCsvExport(opts);
    const mime = isJson ? "application/json" : "text/csv";
    const ext = isJson ? "json" : "csv";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `recorder-${opts.projectSlug}-${stamp}.${ext}`;

    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* Revoke after a tick so the browser has time to start the download. */
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
