# Read-only folders

`skipped/` and `.release/` are **archives**. They are not part of the live source tree and must never be edited.

## Enforcement
- **Core memory rule** — every action checks this prohibition.
- **CI guard** — `.github/workflows/readonly-paths-guard.yml` fails any PR that touches paths under `skipped/**` or `.release/**`.
- **Git attributes** — `.gitattributes` marks both trees as vendored + diff-suppressed to keep code reviews clean.

## If you genuinely need to update one of these folders
1. Stop. Re-read this file.
2. Confirm with the repo owner in writing.
3. Land the change in a separate PR with `[readonly-override]` in the title and a one-line reason in the PR body.
