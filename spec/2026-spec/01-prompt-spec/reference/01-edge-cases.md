# Normative Edge Cases

| # | Scenario | Required behavior |
|---:|---|---|
| 1 | User types `/` mid-word | Do NOT open dropdown (only at line start or after whitespace) |
| 2 | User types `/` in password field | Ignore |
| 3 | Editor is `contenteditable=false` | Ignore |
| 4 | Prompt body contains `${UndefinedVar}` | Resolve to empty string; emit E-03 toast |
| 5 | Prompt body > 64 KB | Reject at parse; surface E-01 |
| 6 | Duplicate `id` on import | Skip import; aggregate count in E-13 |
| 7 | Queue at capacity | Reject enqueue; emit E-06 |
| 8 | Submit button disabled when next-loop fires | Wait up to 5 s polling; then mark task `held` |
| 9 | Host page navigates mid-task | Cancel running task with reason `HostNavigated` |
| 10 | Tab hidden during delay | Continue delay; pause only on explicit user action |
| 11 | Clipboard API blocked | Fall back to `execCommand` then `insertText` event |
| 12 | Rich editor strips formatting | Re-emit as plain text; log `PasteFormatStripped` (info) |
| 13 | Storage quota hit | Pause queue; surface E-12 with export CTA |
| 14 | Two dropdowns triggered simultaneously | Close oldest; only one open at a time |
| 15 | Variable name collides with built-in (`Now`, `Url`) | User var wins; warn at parse |

## Acceptance

- [ ] The implementation satisfies the `Normative Edge Cases` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
