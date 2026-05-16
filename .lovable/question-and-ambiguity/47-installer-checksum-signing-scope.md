# 47 — Installer checksums.txt signing scope (Plan Task 3)

## Context
Plan task 3: "Installer hardening v0.3 — sign `checksums.txt` (minisign/cosign)".
Spec §7.1.4 rule 5 says signing is "an optional v0.3 enhancement — not required".

## Ambiguities

### A. Tool: minisign vs cosign
- **minisign** — tiny single-file binary, ed25519 keys, zero infra (~50KB). Pure file signing.
- **cosign** — Sigstore ecosystem, supports keyless OIDC, larger binary, GitHub-native via `actions/attest-build-provenance`.

### B. Key custody
- Private key must live in GitHub Actions secret (e.g. `MINISIGN_SECRET_KEY`); public key embedded in installer scripts or fetched at runtime.

### C. Verifier strictness
- Soft-skip (match existing AC-23 checksum policy) vs hard-fail when signature missing.

## Decision

1. **Tool: minisign** — smaller dependency, mirrors checksum tool diversity (sha256sum/shasum/openssl) approach; no Sigstore lock-in.
2. **Public key**: env-var override `MARCO_MINISIGN_PUBKEY` (raw base64), empty by default. Installer remains fully functional without it; once user provisions a key, both installers will verify.
3. **Strictness**: soft-skip when (a) pubkey unset, (b) `checksums.txt.minisig` 404, or (c) `minisign` CLI not installed. Hard-abort (`exit 6`) only on **explicit signature mismatch** with a configured pubkey. Mirrors AC-23.
4. **Release-side signing workflow**: NOT shipped in this slice — requires user to generate keypair + add GitHub Actions secret. Documented in spec §7.1.5 as TODO with command recipe.

This unblocks v0.3 verifier infrastructure today; release signing can be enabled later by a single secret-add + workflow edit, with no installer changes needed.
