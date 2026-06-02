# Worked Example — Authoring a New Macro-Prompt with 3 Variables

## Goal
Demonstrate the end-to-end flow: author a macro-prompt under `standalone-scripts/macro-prompts/`, run the aggregation pipeline, register it inside a macro, and execute it.

## Macro-prompt: `summarize-pr`
Produces a PR summary scored 0–100 by clarity.

### Step 1 — create folder
```
standalone-scripts/macro-prompts/030-summarize-pr/
├── info.json
├── body.md
└── README.md
```

### Step 2 — `info.json`
```json
{
  "SchemaVersion": 1,
  "Kind": "macro-prompt",
  "Slug": "summarize-pr",
  "Version": 1,
  "Title": "Summarize PR",
  "Category": "review",
  "Tags": ["pr", "review", "summary"],
  "Variables": [
    { "Name": "PrUrl",       "Type": "String", "Required": true,  "Sensitive": false },
    { "Name": "MaxBullets",  "Type": "Number", "Required": false, "DefaultValue": 5 },
    { "Name": "Tone",        "Type": "Enum",   "Required": false, "DefaultValue": "neutral",
      "EnumValues": ["neutral", "concise", "exhaustive"] }
  ]
}
```

### Step 3 — `body.md`
```
Summarize the pull request at {{ PrUrl }} in at most {{ MaxBullets }} bullets.
Tone: {{ Tone }}.
End with: score: NN/100  (NN = clarity score, 0–100).
```

### Step 4 — run aggregation
```bash
node scripts/build-macro-prompts.mjs
```
Outputs validated `dist/macros.json` entry; CI's `prompts-validate.mjs` passes.

### Step 5 — wire into a macro
Append to `standalone-scripts/macros/001-spec-tighten-cycle.macro.json` (or a new macro) a step:
```json
{
  "StepIndex": 6,
  "Kind": "Prompt",
  "Ref": { "Kind": "macro-prompt", "Slug": "summarize-pr", "Version": 1 },
  "Variables": [
    { "Name": "PrUrl", "Source": "RunContext" },
    { "Name": "Tone",  "Value": "concise" }
  ]
}
```

### Step 6 — run
- Panel → Macros → Run.
- Variable Input Dialog prompts only for `PrUrl` (others have defaults).
- Score parsed via the canonical regex; LoopIf can reference `Outputs.Score`.

## Acceptance checklist
- [ ] `info.json` validates against `schemas/macro-prompt.schema.json`.
- [ ] Aggregation produces a single entry with `Checksum` and resolved `Body`.
- [ ] Variable Input Dialog renders 1 required + 2 optional fields with correct widgets (text, number, enum-select).
- [ ] Sensitive defaults (none here) would be masked in `variables-snapshot.json`.
- [ ] Re-running `build-macro-prompts.mjs` with no source changes is a no-op (idempotent; identical `Checksum`).

## Common authoring pitfalls (all fail-fast, no silent fallback)
| Mistake | Reason code |
|---------|-------------|
| `Variables[].Name` duplicate | `SchemaInvalid` (Ajv `uniqueItems`) |
| Body references `{{ Unknown }}` | `VariableUnresolved` at run time |
| `Enum` default not in `EnumValues` | `SchemaInvalid` |
| Folder index collides with existing | aggregator exits `Reason='SlugCollision'` |
