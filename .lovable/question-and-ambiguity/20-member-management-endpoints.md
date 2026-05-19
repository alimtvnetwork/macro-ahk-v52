# 20 — Member-management endpoints (invite / remove / promote-to-owner)

**Context (full prompt for layman)**: User asked for a Members popup in the Macro Controller with **Add user**, **Remove user**, and **Promote to Owner** buttons. They said "I hope I have given you those JSON APIs". Audit of `standalone-scripts/marco-sdk/src/api-registry.ts` shows **only** the list endpoint exists:

```
memberships.search → GET /workspaces/{wsId}/memberships/search?status=active&limit=20
```

There is **no invite, no delete, no role-change** endpoint registered in the SDK, and no prior chat message (310 messages searched) contains the spec for them.

## What we need

The exact HTTP shape (method, path, request body, success/error codes) for each of:

1. **Invite** a user by email (with role: member | owner)
2. **Remove** a user from the workspace
3. **Promote** an existing member to Owner

## Options

### A — Assume Lovable's conventional REST shape (recommended)

Add to `api-registry.ts`:
```
invite : POST   /workspaces/{wsId}/memberships         body { email, role }
remove : DELETE /workspaces/{wsId}/memberships/{userId}
update : PATCH  /workspaces/{wsId}/memberships/{userId} body { role: "owner" }
```

- **Pros**: matches Lovable's other workspace endpoints (`/workspaces/{wsId}/…`); zero blocking on user; can ship today; easy to correct later by editing one registry entry per endpoint.
- **Cons**: if the real server uses different verbs/paths (e.g. `/invites`, `/transfer-ownership`), the buttons return 404 the first time and we patch.

### B — Stop and wait for the user to paste the actual JSON/curl examples

- **Pros**: zero risk of wrong endpoint; first call works.
- **Cons**: blocks the entire remainder of the plan (tasks 11–15) until user replies; violates active No-Questions Mode.

### C — Sniff the real network calls from the Lovable web app

- **Pros**: definitive ground truth.
- **Cons**: requires manual browser testing which is in the "Deferred Workstreams" deny-list (`mem://preferences/deferred-workstreams`).

## Recommendation

**Option A**. It is reversible in <5 minutes per endpoint, unblocks tasks 11–15 immediately, and follows the same path pattern already proven for `memberships.search`. When the user next opens the panel and clicks Add/Remove/Promote we will see the actual response code in the toast; a 404/405 maps to a one-line registry edit.

We will mark the three new registry entries with a `// PENDING-VERIFY: confirm path with backend` comment and add a section in spec 113 listing them under "to verify on first live call".

Proceeding with Option A.
