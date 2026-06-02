# Macro-Prompts — Aggregation Pipeline

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Extends the existing `scripts/aggregate-prompts.mjs` so a single build pass emits **two** bundles: the legacy `prompts.json` and the new `macro-prompts.json`. Sequential, fail-fast — per `mem://constraints/no-retry-policy`.

## Inputs

```
standalone-scripts/prompts/<NNN-slug>/{info.json, prompt.md}        # existing
standalone-scripts/macro-prompts/<NNN-slug>/{info.json, prompt.md}  # NEW
```

## Outputs

```
chrome-extension/prompts/prompts.json              # existing (unchanged shape)
chrome-extension/macro-prompts/macro-prompts.json  # NEW
```

Both bundles share the wrapper schema (`schemas/prompts-bundle.schema.json`) for tooling reuse.

## Bundle shape (`macro-prompts.json`)

```json
{
  "Version": "1.0.0",
  "BuildHash": "00042-3F7K1Z",
  "GeneratedAt": "2026-06-02T10:15:00+08:00",
  "Source": "macro-prompts",
  "Count": 5,
  "Prompts": [
    {
      "Slug": "audit-spec",
      "Title": "Audit Spec Folder",
      "Category": "Audit",
      "Version": "1.0.0",
      "Variables": [ /* … */ ],
      "Body": "Audit folder {{ TargetFolder }} …",
      "WritesTo": ["spec/audit/{{ RunId }}/"],
      "EmitsScore": true,
      "IsExperimental": false
    }
  ]
}
```

## Pipeline stages (sequential, fail-fast)

1. **Discover** — `readdir` both source folders. Skip dotfiles. Capture numeric prefix + slug.
2. **Validate naming** — apply regex from `01-naming-and-numbering.md`. Fail with the specific `Reason` code.
3. **Read & parse** — `info.json` (JSON.parse, strict) + `prompt.md` (UTF-8, size ≤ 64 KB).
4. **Schema-validate** — Ajv against `schemas/prompt.schema.json`. Strict mode, `additionalProperties: false`.
5. **Cross-validate** — every `{{ Placeholder }}` in `prompt.md` must be declared in `Variables[]` (or be a run-context built-in listed in `variables/05-built-in-context.md`). Missing → `Reason="UndeclaredPlaceholder"` with `VariableContext[]`.
6. **Detect duplicates** — across the **union** of both folders. Duplicate slug → `Reason="DuplicateSlug"` with both file paths.
7. **Sort** — by numeric prefix ascending, then slug.
8. **Hash** — compute `BuildHash = <Count zero-padded 5>-<base36 sha256 of concatenated canonical JSON, first 6 chars upper>`. See `06-versioning.md`.
9. **Emit** — write `chrome-extension/macro-prompts/macro-prompts.json` atomically (write to `*.tmp`, then rename).
10. **Manifest sync** — append `BuildHash` to the build manifest consumed by `LoadBundledDefaultPrompts` (`mem://features/prompt-management`).

## Error handling

- Any failure aborts the script with exit code `1`.
- Failure log includes: `Reason`, `ReasonDetail`, absolute path of the offending file, and (when applicable) `SelectorAttempts[]` and `VariableContext[]` per `mem://standards/verbose-logging-and-failure-diagnostics`.
- No retries, no backoff — first failure wins. Single-attempt webhook style (`mem://constraints/webhook-fail-fast`).

## CI hook

The existing prebuild validator (`scripts/prebuild-clean-and-verify.mjs`) gains one extra assertion:

- `chrome-extension/macro-prompts/macro-prompts.json` exists, parses, and its `BuildHash` matches a freshly-recomputed hash. Mismatch → fail.

Build lock is honoured via `scripts/lib/build-lock.mjs` (`mem://features/build-lock-sentinel`).

## Test coverage (matches `mem://preferences/test-with-features`)

- Unit: discovery, regex validation, duplicate-slug detection, placeholder cross-validation, hash determinism.
- Integration: full pipeline against a fixture of 3 valid + 4 invalid directories; asserts each invalid case emits the documented `Reason` code.
