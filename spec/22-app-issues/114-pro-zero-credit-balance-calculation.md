# Issue 114 — `pro_0` Credit Balance Calculation (CreditBalance source-of-truth)

**Spec ID:** `spec/22-app-issues/114-pro-zero-credit-balance-calculation.md`
**Status:** Draft (awaiting `next` to implement, one step at a time)
**Owner:** Macro Controller
**Created:** 2026-05-25 ()
**Target version:** `v3.11.0` (minor bump from current `v3.10.0`)
**Related spec:** `spec/22-app-issues/110-macro-controller-pro-zero-credit-balance.md`
**Related memory:** `mem://features/macro-controller/pro-zero-credit-balance` (to be updated on Step 5)

---

## 1. Verbatim (source of truth)

> When you see the JSON like this, you have to calculate the credit balance properly. First of all, you can see total granted credit, which is 205, and total remaining credit should be the available credit, which is not done properly in some ways. Please check and get it correct for the `pro_0` plan. Write the spec, the RCA, the steps. Complete it in 5 steps. Also write end-to-end testing. At the end of the steps, bump the minor version, add the changelog, and add it to the root README. Plan at least 30 small tests for credits — small, small, small tests — so you can test from the code. End-to-end as well if possible: feed this JSON in and see what the function yields. For IDs and emails in tests, use sample/anonymized values — do not expose real IDs or emails.

### 1.1 Reference payload (verbatim, sanitized in tests)

```json
{
  "Source": "CREDIT_BALANCE",
  "Workspace": {
    "id": "<workspace-id>",
    "plan": "pro_0",
    "plan_type": "monthly",
    "...": "..."
  },
  "CreditBalance": {
    "ledger_enabled": false,
    "total_remaining": 76,
    "total_granted": 205,
    "daily_remaining": 5,
    "daily_limit": 5,
    "total_billing_period_used": 144,
    "expiring_grants": [
      { "grant_type": "billing", "applicability": "build_time", "credits": 71, "expires_at": "2026-07-07T08:00:00Z" }
    ],
    "grant_type_balances": [
      { "grant_type": "daily",   "granted": 5,   "remaining": 5  },
      { "grant_type": "billing", "granted": 200, "remaining": 71 }
    ]
  }
}
```

Expected display for this payload (the contract):

| Field             | Expected | Source                                  |
|-------------------|----------|------------------------------------------|
| `Total`           | **205**  | `CreditBalance.total_granted`            |
| `AvailableCredits`| **76**   | `CreditBalance.total_remaining`          |
| `TotalUsed`       | **144**  | `CreditBalance.total_billing_period_used`|
| `DailyFree`       | **5**    | `CreditBalance.daily_remaining`          |
| `Billing`         | **71**   | grant_type_balances[billing].remaining   |
| `Bonus / Topup`   | **0**    | sum of `topup` + `bonus` (none present)  |

---

## 2. Root Cause Analysis (RCA)

### 2.1 Symptom
On a `pro_0` workspace, the status bar / hover card shows incorrect numbers for **Total** and **Available**. Example with the payload above:

- Total shown: a sum like `granted + dailyLimit + billingLimit + topupLimit + rolloverLimit` ≠ `205`.
- Available shown: not equal to `total_remaining = 76`.

### 2.2 Direct cause
`src/credit-api.ts → calcTotalCredits()` and `calcAvailableCredits()` are **legacy aggregators** designed for the old workspace-only endpoint. They:

1. **Sum every `*_limit` field** (`granted + daily + billing + topup + rollover`) → produces values like `5 + 200 + 0 + 0 + 0 = 205` only by coincidence. Once `dailyLimit` or `rolloverLimit` is non-zero on a pro_0 plan it double-counts, because for pro_0 those buckets are already inside `total_granted`.
2. **Subtract every `*_used` field** independently → drifts from the server-authoritative `total_remaining`.

### 2.3 Why it slipped through
- Spec `110` introduced the pro_0 branch in `pro-zero-credit-summary.ts` with the correct mapping (`Total ← total_granted`, `Available ← total_remaining`), but **`pro-zero-enrichment.ts → applySummaryToRow()`** assigns the summary onto `WorkspaceCredit` while several downstream renderers still call `calcTotalCredits` / `calcAvailableCredits` against the *raw workspace* fields, overwriting or shadowing the enriched values.
- No unit tests pinned the mapping for a pro_0 payload — only the resolver/cache paths were tested.
- The hover card and the status bar consume **different code paths**, so a partial fix on one renderer masks the bug on the other.

### 2.4 Contributing factors
- `calcTotalCredits` / `calcAvailableCredits` accept 5 raw numbers — there is no type guard that says "do not call this for pro_0".
- `applySummaryToRow` sets `billingAvailable = max(0, Total - TotalUsed)` which only works when `topup`/`bonus` are zero; for `pro_0` with bonus credits this drifts.

### 2.5 Why “sometimes correct”
The legacy formula happens to yield the right number for some payloads (when `daily_limit` and `rollover_limit` are both 0 and no topup/bonus exist). The reference payload above triggers the wrong path because `daily_limit=5` is included in `total_granted` already.

---

## 3. STRICT rules (carry-over from spec 110)

1. For `WorkspacePlan.PRO_ZERO`, the **only** authoritative source for `Total` / `Available` / `TotalUsed` is the `/credit-balance` response — never derived from workspace `*_limit` fields.
2. `Total = total_granted`, `Available = total_remaining`, `TotalUsed = total_billing_period_used`. Pinned by tests.
3. `Billing`, `Daily`, `Topup`, `Bonus`, `Rollover` sub-buckets are derived from `grant_type_balances[].remaining` keyed by `grant_type`, **never** from workspace fields when plan is pro_0.
4. All raw strings (`"pro_0"`, `"daily"`, `"billing"`, `"topup"`, `"bonus"`, `"rollover"`) live in Enums / constants — zero magic strings outside the mapper.
5. No `any`, no `unknown` (except `CaughtError`), every function ≤ 8 lines / file ≤ 100 lines (per CQ rules).
6. Every fetch wrapped in `try/catch`; failures surfaced as typed `CreditBalanceFetchResult` (status + reason + detail).
7. Bearer token redacted in all logs; IDs/emails redacted in test fixtures.
8. **Test-with-features** policy: every new function ships with ≥3 unit tests; module ships with ≥30 total tests + 1 end-to-end harness.

---

## 4. Mapping table (single source of truth)

| `MacroCreditSummary` field      | Source (PRO_ZERO only)                                              |
|---------------------------------|---------------------------------------------------------------------|
| `Total`                         | `CreditBalance.total_granted`                                       |
| `AvailableCredits`              | `CreditBalance.total_remaining`                                     |
| `TotalUsed`                     | `CreditBalance.total_billing_period_used`                           |
| `DailyRemaining`                | `CreditBalance.daily_remaining`                                     |
| `DailyLimit`                    | `CreditBalance.daily_limit`                                         |
| `BillingRemaining`              | `grant_type_balances[grant_type=billing].remaining` (0 if absent)   |
| `TopupRemaining`                | `grant_type_balances[grant_type=topup].remaining`   (0 if absent)   |
| `BonusRemaining`                | `grant_type_balances[grant_type=bonus].remaining`   (0 if absent)   |
| `RolloverRemaining`             | `grant_type_balances[grant_type=rollover].remaining`(0 if absent)   |
| `ExpiringSoonCredits`           | sum of `expiring_grants[].credits` where `expires_at` ≤ now + 14d   |
| `LedgerEnabled`                 | `CreditBalance.ledger_enabled`                                      |
| `Source`                        | `MacroCreditSource.CREDIT_BALANCE`                                  |

---

## 5. Step plan (5 steps — implement on each `next`)

> Each step ends with: **(a) all checks green** and **(b) tests added/passing**.
> Read-only spec — do **not** start coding until the user says `next`.

### Step 1 — Pure calculator module + 12 unit tests
**Goal:** Create `src/pro-zero/pro-zero-credit-calculator.ts` — single pure function `calculateProZeroCreditSummary(balance: CreditBalanceResponseTyped): ProZeroCreditSummary`. No I/O. No globals.

**Tasks:**
- New file: `pro-zero-credit-calculator.ts` (≤100 lines, ≤8 lines/fn).
- New type: extend `pro-zero-credit-summary.ts` shape with `DailyRemaining`, `BillingRemaining`, `TopupRemaining`, `BonusRemaining`, `RolloverRemaining`, `ExpiringSoonCredits`, `LedgerEnabled`.
- Helpers: `sumGrantTypeRemaining(balance, GrantType)`, `sumExpiringSoon(balance, nowMs, windowDays)`.

**Tests (12):** see §7 group A.

### Step 2 — Wire calculator into `pro-zero-credit-summary.ts` + retire legacy branch for pro_0
**Goal:** `buildSummary()` delegates entirely to `calculateProZeroCreditSummary`. Remove the implicit assumption that `Bonus`/`Topup`/`Rollover` are zero.

**Tasks:**
- Replace inline `buildSummary` body with calculator call.
- Update `applySummaryToRow` in `pro-zero-enrichment.ts` to copy **all** new fields onto `WorkspaceCredit` (do not recompute `billingAvailable` from `Total - TotalUsed`).
- Add a defensive guard: if `mapWorkspacePlan(ws.plan) === PRO_ZERO`, refuse to fall back to `calcTotalCredits`/`calcAvailableCredits` in any renderer. Add an `assertNotLegacyCalcForProZero(plan)` invariant in those legacy helpers (throws in dev, logs `Logger.error` in prod with **path + missing item + reasoning** per CODE RED).

**Tests (8):** see §7 group B.

### Step 3 — Renderers consume enriched fields (status bar, hover card, Copy-JSON)
**Goal:** No renderer reads `daily_limit`/`billing_period_credits_limit` from raw workspace for pro_0.

**Tasks:**
- `credit-api.ts → renderCreditBar`: when `opts.plan === PRO_ZERO`, source `freeRemaining`, `billingAvail`, `rollover`, `dailyFree` from the enriched `WorkspaceCredit` fields written in Step 2.
- Hover card: same.
- Copy-JSON (right-click on pro_0 workspace): include the verbatim `/credit-balance` JSON next to workspace JSON (already in spec 110 §3 — verify it still works after refactor).

**Tests (6):** see §7 group C.

### Step 4 — End-to-end harness + 6 E2E cases
**Goal:** A node-runnable harness that **feeds JSON payloads in → asserts MacroCreditSummary out**, no Chrome required.

**Tasks:**
- New folder: `standalone-scripts/macro-controller/tests/e2e/credit-balance/`
- New script: `run-credit-balance-e2e.mjs` — loads each `fixtures/*.json`, runs `calculateProZeroCreditSummary`, asserts `expected.json` deep-equals output.
- New fixtures (6): `reference-205-76-144.json`, `zero-remaining.json`, `topup-only.json`, `bonus-and-billing.json`, `ledger-enabled.json`, `expiring-soon.json`. All IDs/emails anonymized (`<workspace-id>`, `owner@sample.com`, `member@sample.com`).
- Wire into `package.json` script `test:credits-e2e` and add to `npm test` / CI preflight.

**Tests (6):** see §7 group D.

### Step 5 — Release: bump to v3.11.0, changelog, root README, memory
**Goal:** Ship.

**Tasks:**
- Bump version in **all** version-sync locations (the `check-version-sync.mjs` audit drives the list — manifest, `constants.ts` (`MACRO_VERSION`), `package.json` where applicable, build scripts).
- `standalone-scripts/macro-controller/changelog.md`: new `## v3.11.0 (2026-05-25)` section with Fixed / Added / Tests subsections.
- Root `readme.md`: pin to `v3.11.0` line + one-line summary.
- Update `mem://features/macro-controller/pro-zero-credit-balance` with: "Total=total_granted, Available=total_remaining, TotalUsed=total_billing_period_used. Sub-buckets from grant_type_balances. Never derive from workspace *_limit for pro_0." Update `mem://index.md` Memories list.
- ⚠️ Per memory: **do not** modify `readme.txt`. **Do not** send CI notifications.

---

## 6. Test plan — 30 small unit tests + 6 end-to-end

> All tests use Vitest. All IDs anonymized (`ws-001`, `proj-001`, `owner-uid-001`, `member-uid-001`), all emails `owner@sample.com` / `member@sample.com`. No real Lovable IDs in fixtures.

### Group A — calculator (12 tests) — Step 1
1. `Total` equals `total_granted` for reference payload (→ 205).
2. `AvailableCredits` equals `total_remaining` (→ 76).
3. `TotalUsed` equals `total_billing_period_used` (→ 144).
4. `DailyRemaining` equals `daily_remaining` (→ 5).
5. `DailyLimit` equals `daily_limit` (→ 5).
6. `BillingRemaining` equals `grant_type_balances[billing].remaining` (→ 71).
7. `TopupRemaining` returns `0` when no `topup` grant present.
8. `BonusRemaining` returns `0` when no `bonus` grant present.
9. `RolloverRemaining` returns `0` when no `rollover` grant present.
10. `LedgerEnabled` mirrors `ledger_enabled` (false → false, true → true).
11. `Source` is always `MacroCreditSource.CREDIT_BALANCE`.
12. `ExpiringSoonCredits` sums credits whose `expires_at` ≤ now+14d (uses injected `nowMs`).

### Group B — wiring & invariants (8 tests) — Step 2
13. `buildSummary` returns same object as `calculateProZeroCreditSummary` (single source of truth).
14. `applySummaryToRow` copies `Total`/`Available`/`TotalUsed` verbatim — does not recompute.
15. `applySummaryToRow` writes all 5 sub-bucket fields onto `WorkspaceCredit`.
16. `calcTotalCredits` throws (dev) / logs CODE RED error (prod) when called with `plan=PRO_ZERO`.
17. `calcAvailableCredits` same as #16.
18. Non-pro_0 plan still flows through legacy `calcTotalCredits` unchanged.
19. `applySummaryToRow` for pro_0 sets `billingAvailable` to `BillingRemaining` (not `Total - TotalUsed`).
20. Missing `grant_type_balances` array → all sub-buckets default to `0`, no throw.

### Group C — renderer integration (6 tests) — Step 3
21. `renderCreditBar` for pro_0 reads `WorkspaceCredit.billingAvailable` not `ws.rawApi.billing_period_credits_limit`.
22. Hover card title shows `Available: 76 / Total: 205 (Used: 144)` for the reference payload.
23. Status bar compact mode shows `⚡76/205`.
24. Status bar non-compact shows `🎁0 💰71 🔄0 📅5 ⚡76/205` for reference payload.
25. Right-click Copy-JSON on pro_0 workspace includes both raw workspace JSON and verbatim `/credit-balance` JSON.
26. Non-pro_0 workspace renders via legacy path (no regression).

### Group D — E2E (6 tests) — Step 4
27. `reference-205-76-144.json` → `{Total:205, Available:76, Used:144, DailyRemaining:5, Billing:71}`.
28. `zero-remaining.json` (all `*_remaining = 0`) → `{Total:200, Available:0, Used:200}`.
29. `topup-only.json` (only `topup` grant) → `{Total, Available, TopupRemaining > 0, BillingRemaining:0}`.
30. `bonus-and-billing.json` → both `BonusRemaining` and `BillingRemaining` non-zero and sum ≤ `Available`.
31. `ledger-enabled.json` → `LedgerEnabled:true`, all other fields still correct.
32. `expiring-soon.json` (grant expiring in 7d) → `ExpiringSoonCredits` includes it; grant expiring in 60d excluded.

### Group E — extra small tests (4 tests) — distributed across steps
33. `sumGrantTypeRemaining` returns 0 for empty array.
34. `sumGrantTypeRemaining` is case-sensitive on `grant_type` (matches Enum value exactly).
35. `mapWorkspacePlan('pro_0')` → `WorkspacePlan.PRO_ZERO` (already exists — re-pin).
36. `isProZeroPlan(WorkspacePlan.PRO_ZERO)` → true; every other enum value → false.

**Total: 36 tests (12 + 8 + 6 + 6 + 4)** — exceeds the requested ≥30.

---

## 7. Failure-log shape (mandatory per memory)

On calculator failure or parse error, emit via `RiseupAsiaMacroExt.Logger.error()`:

```ts
{
  Reason: 'ProZeroCalcFailed',
  ReasonDetail: '<short cause>',
  VariableContext: [
    { name: 'total_granted',  source: 'CreditBalance', resolvedValue: <n|null>, type: 'number', reason: '<if missing>' },
    { name: 'total_remaining',source: 'CreditBalance', resolvedValue: <n|null>, type: 'number', reason: '<if missing>' },
    { name: 'grant_type_balances', source: 'CreditBalance', resolvedValue: '<array|null>', type: 'array', reason: '<if missing>' }
  ],
  Path: 'standalone-scripts/macro-controller/src/pro-zero/pro-zero-credit-calculator.ts'
}
```

CODE RED path errors (missing module / fixture) MUST include exact path + missing item + reasoning.

---

## 8. Release checklist (Step 5)

- [ ] `npm test` green (36 unit tests + lint + tsc)
- [ ] `npm run test:credits-e2e` green (6 fixtures)
- [ ] `node scripts/check-version-sync.mjs` green at `v3.11.0`
- [ ] `standalone-scripts/macro-controller/changelog.md` updated
- [ ] Root `readme.md` version line updated to `v3.11.0`
- [ ] `mem://features/macro-controller/pro-zero-credit-balance` updated + `mem://index.md` Memories list
- [ ] No `readme.txt` edits (per memory constraint)
- [ ] No CI notification triggers added

---

## 9. Out of scope

- Non-pro_0 plans — legacy `calcTotalCredits` / `calcAvailableCredits` paths untouched.
- Server-side credit logic.
- New UI design — pure data-correctness fix.
- P Store, Cross-Project Sync — deferred per `mem://preferences/deferred-workstreams`.
