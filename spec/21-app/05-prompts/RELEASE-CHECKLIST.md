# Spec Release Checklist

Status: Normative · v1.0.0 · 2026-06-02

Use for every MINOR or MAJOR spec release. PATCH releases may skip items marked (P).

## Pre-merge
- [ ] All edited normative docs have updated `Status` line + version
- [ ] JSON schemas validate sample fixtures (testing/13)
- [ ] Cross-references resolved (no dangling `spec/...` paths)
- [ ] BLIND-AI-SMOKE-TEST.md still passes 20/20
- [ ] IMPLEMENTATION-CHECKLIST.md updated if surface changed
- [ ] CHANGELOG.md entry under correct SemVer bucket
- [ ] (P) GLOSSARY.md / ACRONYMS.md updated for new terms

## Schema/grammar changes (MAJOR only)
- [ ] MIGRATION.md updated with before/after sample
- [ ] Deprecation announced ≥ 2 MINOR releases prior (governance/10)
- [ ] Reason code added/updated (observability/12)

## Security-touching changes
- [ ] Threat model (security/10) re-reviewed
- [ ] Guards forbidden/allowed matrix updated (guards/10)
- [ ] Sensitive patterns reviewed (variables/13)

## Post-merge
- [ ] Tag spec version in repo (`spec-v<major.minor.patch>`)
- [ ] Update mem://features/prompt-macros + prompt-variables if surface changed
- [ ] Notify owners listed in OWNERSHIP.md
- [ ] File close-out note in 99-spec-issues/

## Rollback
If smoke test drops below 20/20 post-release, revert tag and open Critical issue in 99-spec-issues/.
