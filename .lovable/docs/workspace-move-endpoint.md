# Workspace Move — How It Works

Single PUT call routed through the marco-sdk API registry, with a post-move credit refresh.

## Endpoint

| Field        | Value                                                       |
| ------------ | ----------------------------------------------------------- |
| **Method**   | `PUT`                                                       |
| **URL**      | `https://lovable-api.com/projects/{projectId}/move-to-workspace` |
| **Auth**     | `Authorization: Bearer <token>` (via `getBearerToken()`)    |
| **Body**     | `{ "workspace_id": "<targetWorkspaceId>" }`                 |
| **Headers**  | `Content-Type: application/json`                            |
| **Registry** | `marco-sdk` → `api.workspace.move` (see `standalone-scripts/marco-sdk/src/api-registry.ts:60`) |

## Request example

```http
PUT /projects/abc123/move-to-workspace HTTP/1.1
Host: lovable-api.com
Authorization: Bearer eyJhbGciOi...REDACTED
Content-Type: application/json

{ "workspace_id": "ws_DEST_999" }
```

## Response handling (`ws-move.ts`)

| Status                       | Meaning                          | Action                                                       |
| ---------------------------- | -------------------------------- | ------------------------------------------------------------ |
| `2xx`                        | Move succeeded                   | Update UI, **await** `/credit-balance` refresh for source + target, then `/user/workspaces` refresh |
| `403` + `{type:"castle_denied"}` | Lovable security block       | Show castle toast, clear delegation state, **no retry**      |
| `401` / `403` (first attempt) | Stale token                     | Force `getBearerToken({ force: true })`, retry **once**      |
| `401` / `403` (retry)         | Auth still bad                  | Surface auth error toast, stop                               |
| Other non-2xx                 | Server error                    | Log + toast, stop (no retry — `mem://constraints/no-retry-policy`) |

## End-to-end flow

1. **Trigger** — checkbox / adjacent button / drop event → `gatedMoveToWorkspace()` (gated by `Loop.RunStateGate.Enabled`)
2. **Token** — `getBearerToken()` (unified auth contract)
3. **PUT** `/projects/{projectId}/move-to-workspace` via `window.marco.api.workspace.move(...)`
4. **Castle / auth guards** — see table above
5. **Post-move sync (v3.40.0)** — `await fetchAndPersist(target, force=true)` then `fetchAsync()` for `/user/workspaces`. Never fire-and-forget for the target workspace (see `mem://features/macro-controller/post-move-credit-sync`).
6. **UI** — `updateLoopMoveStatus()` toast transitions: `loading` → `success` / `error`.

## Key files

- `standalone-scripts/marco-sdk/src/api-registry.ts` — endpoint definition
- `standalone-scripts/macro-controller/src/ws-move.ts` — orchestration, retry, castle handling
- `standalone-scripts/macro-controller/src/loop-move-gate.ts` — run-state gate wrapper
- `standalone-scripts/macro-controller/src/ws-adjacent.ts` — adjacent-workspace move trigger
- `standalone-scripts/macro-controller/src/ws-checkbox-handler.ts` — manual checkbox trigger

## Invariants

- **Single PUT site** — only `executeMove()` issues the PUT; all callers funnel through `moveToWorkspace()` → `gatedMoveToWorkspace()`.
- **No retry/backoff** — exactly one auth-retry on 401/403; otherwise fail fast.
- **Awaited target refresh** — `pro_0` and `pro_1` credit balances MUST be re-fetched and persisted before the function resolves.
