# T34 · Defaults vs user prompts — merge precedence

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

A running Prompts feature typically merges **two** sources:

1. **Defaults bundle** — read-only prompts shipped with the HostApp
   (`isDefault: true`, deterministic ids `default-<slug>`).
2. **User store** — prompts the End User created or edited
   (`isDefault: false`).

## Merge algorithm

```
final = []
for each default D:
    U = user.getBySlug(D.slug)
    if U exists:
        final.push(U)              # user override wins
    else:
        final.push(D)
for each user prompt U where slug not in defaults:
    final.push(U)
sort final by (category, order, title)
```

## Rules

1. **User overrides are by slug**, not by id. Editing a default prompt
   creates a *new* user record with a *new* id but the *same* slug.
2. **Defaults are never deleted.** "Delete" on a default record sets
   a `hidden: true` flag in the user store; the merge skips hidden
   defaults. Re-show by removing the flag.
3. **Restoring a default** = delete the user override with the same slug.
4. **Version drift:** if a shipped default's `version` is newer than
   the user override's `version`, the UI MAY surface an "update
   available" affordance, but MUST NOT auto-overwrite the override.
5. **`createdAt` / `updatedAt`** on an override always reflect the
   user's write, not the default's timestamps.

## Why "by slug, not by id"

Default ids are deterministic across installs (`default-next-tasks`),
but user records are created with fresh UUIDs. Slug is the only stable
key both sides agree on.
