# Macro-Prompts — Naming & Numbering

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

## Directory name grammar

```
<NNN>-<kebab-slug>
```

- `NNN` — 3-digit zero-padded decimal, `001`–`999`. Gaps are allowed; ordering is by numeric prefix ascending.
- `-` — single hyphen separator.
- `<kebab-slug>` — lowercase ASCII letters, digits, and hyphens; must start with a letter; no consecutive hyphens; max 48 chars.

Regex (authoritative):

```
^(\d{3})-([a-z][a-z0-9]*(?:-[a-z0-9]+)*)$
```

Examples — valid:

```
001-audit-spec
002-fix-from-audit
003-final-score
014-gap-analysis
```

Invalid (and the failure code emitted by the aggregator):

| Directory                | Reason                          |
|--------------------------|---------------------------------|
| `1-audit-spec`           | `NumberingNotZeroPadded`        |
| `001_audit_spec`         | `SlugInvalidCharacters`         |
| `001-Audit-Spec`         | `SlugInvalidCharacters`         |
| `001-audit--spec`        | `SlugConsecutiveHyphens`        |
| `001-`                   | `SlugMissing`                   |

## Slug rules

- The slug segment (everything after `NNN-`) is the **canonical identifier** used by macros to reference the prompt.
- Slug MUST be globally unique across both `prompts/` and `macro-prompts/` (see `04-resolution-order.md` — `Reason="DuplicateSlug"`).
- Renaming a slug is a breaking change; bump the bundle version and update any macro that references it.

## Numbering hygiene

- Reserve `001`–`099` for built-in starter macro-prompts shipped with the extension.
- `100`–`899` for user/community macro-prompts.
- `900`–`999` reserved for experimental / internal-only prompts; aggregator emits them with `IsExperimental: true` in the bundle.
- Do **not** renumber existing directories; numeric prefix is informational only — slug is the identity.
