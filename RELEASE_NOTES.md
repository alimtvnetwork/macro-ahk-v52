# Marco Chrome Extension v3.94.0

## Fixed

- **Workspace badge for `ktlo_2` plan now shows "Light 2" (was "Pro").**
  Wire plans `ktlo_<N>` (Lovable Lite tiers) were falling through the plan
  mapper and tier resolver, ending up as `PRO`. They now correctly resolve to
  `Plan.Ktlo` / `WsTierValue.LITE` and the badge label reads `Light N`.

## Files changed

- `standalone-scripts/macro-controller/src/credit-balance-update/plan-mapper.ts`
- `standalone-scripts/macro-controller/src/credit-parser.ts` (`resolveWsTier`)
- `standalone-scripts/macro-controller/src/ws-list-renderer.ts`
  (`resolveTierBadgeLabel` + `buildTierBadgeHtml`)

## Verification

- `node scripts/check-version-sync.mjs` → expected ✅ All versions in sync: 3.94.0.
- After rebuild + extension reload, workspace `A0135 D3v135 L16` (plan
  `ktlo_2`) renders a blue `Light 2` badge instead of an orange `PRO` badge.

---

(See `changelog.md` for full history.)
