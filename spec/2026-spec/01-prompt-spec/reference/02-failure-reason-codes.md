# Failure Reason Codes (closed enum)

Every `FailureReport.Reason` MUST be one of these. Adding a code requires a spec PR.

| Code | Phase | Meaning |
|---|---|---|
| `LoaderParseFailed` | load | `info.json` or `prompt.md` invalid |
| `LoaderSourceUnreachable` | load | source IO failed |
| `VariableMissing` | resolve | required var with no default |
| `VariableTypeMismatch` | resolve | provided value fails type check |
| `EditorNotFound` | inject | no adapter matched |
| `PasteVerificationFailed` | inject | post-paste text not present |
| `ClipboardBlocked` | inject | all clipboard fallbacks failed |
| `SubmitButtonNotFound` | next | host submit selector unresolved |
| `SubmitButtonDisabled` | next | disabled past 5 s grace |
| `HostNavigated` | run | page navigated mid-task |
| `QueueFull` | enqueue | over capacity |
| `RetryExhausted` | lifecycle | retries exceeded `maxRetries` |
| `Cancelled` | lifecycle | user cancelled |
| `Timeout` | run | task exceeded budget |
| `StorageQuotaExceeded` | persist | storage write failed |
| `InternalAssertionFailed` | any | invariant violation (bug) |

## Acceptance

- [ ] The implementation satisfies the `Failure Reason Codes (closed enum)` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
