# Macro-Prompts — `info.json` Schema

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

PascalCase keys throughout (matches the rest of the extension's on-disk convention; storage layer is identity-only per `mem://constraints/no-storage-pascalcase-migration`).

## Canonical example

```json
{
  "Slug": "audit-spec",
  "Title": "Audit Spec Folder",
  "Description": "Audits a spec subtree to a given depth and emits a 0–100 score.",
  "Category": "Audit",
  "Version": "1.0.0",
  "IsFavorite": false,
  "IsExperimental": false,
  "Variables": [
    {
      "Name": "TargetFolder",
      "Type": "path",
      "Required": true,
      "Description": "Spec subtree to audit, relative to repo root."
    },
    {
      "Name": "Depth",
      "Type": "integer",
      "Required": false,
      "Default": 3,
      "Description": "Max depth to walk."
    },
    {
      "Name": "RunId",
      "Type": "string",
      "Required": true,
      "Source": "RunContext",
      "Description": "Provided automatically by the macro engine."
    }
  ],
  "WritesTo": ["spec/audit/{{ RunId }}/"],
  "EmitsScore": true
}
```

## Field reference

| Key              | Type                    | Required | Notes                                                                 |
|------------------|-------------------------|----------|-----------------------------------------------------------------------|
| `Slug`           | string                  | yes      | Must match directory slug; globally unique. Regex per `01-…md`.       |
| `Title`          | string ≤ 80             | yes      | Human-readable; displayed in Prompts panel Macros tab.                |
| `Description`    | string ≤ 500            | yes      | One-paragraph purpose.                                                |
| `Category`       | string ≤ 40             | yes      | Used by the Prompts panel filter chips.                               |
| `Version`        | semver string           | yes      | Bump on body or Variables[] change.                                   |
| `IsFavorite`     | boolean                 | no       | Default `false`.                                                      |
| `IsExperimental` | boolean                 | no       | Default derived from numeric prefix (900–999 → true).                 |
| `Variables`      | Variable[] (see below)  | yes      | May be empty array; never omit the key.                               |
| `WritesTo`       | string[] (path globs)   | no       | Engine asserts every write target matches one of these globs.         |
| `EmitsScore`     | boolean                 | no       | If `true`, output must include `Score: <0-100>/100` line.             |

## Variable[] entry

| Key            | Type                                              | Required | Notes                                              |
|----------------|---------------------------------------------------|----------|----------------------------------------------------|
| `Name`         | `[A-Z][A-Za-z0-9]*`                               | yes      | PascalCase. Matches `{{ Name }}` placeholder.     |
| `Type`         | `string` \| `integer` \| `number` \| `boolean` \| `enum` \| `path` | yes | See `variables/04-types.md`.            |
| `Required`     | boolean                                           | yes      | If `true` and no `Default`, run-time prompts user. |
| `Default`      | matches `Type`                                    | no       | Forbidden when `Required: true` AND `Source: "RunContext"`. |
| `EnumValues`   | string[]                                          | yes if `Type=="enum"` | Non-empty.                                |
| `Sensitive`    | boolean                                           | no       | Masks value in all logs (`***`).                  |
| `Source`       | `User` \| `RunContext` \| `Macro` \| `Step`       | no       | Hint to the UI; defaults to `User`.                |
| `Description`  | string ≤ 200                                      | yes      | Shown in the inline prompt dialog.                 |

## Hard validation

Aggregator validates each `info.json` against `schemas/prompt.schema.json` (Ajv, strict). Any failure aborts the build with a non-zero exit code and emits the standard failure-log shape (`Reason`, `ReasonDetail`, `VariableContext[]`) per repo standard.
