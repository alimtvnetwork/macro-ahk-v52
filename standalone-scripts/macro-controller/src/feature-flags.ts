/**
 * Feature flags (Issue 124 §6, plus future flags).
 *
 * Source of truth: an in-memory map seeded with safe defaults. Production
 * overrides arrive via `window.marco.featureFlags` (set by the background
 * service worker on boot). Reads are synchronous and side-effect-free.
 *
 * Standards:
 *   - mem://standards/unknown-usage-policy — no implicit any/unknown leakage.
 *   - mem://constraints/no-retry-policy — flag reads are single-shot.
 */

export type FeatureFlagName = 'Loop.RunStateGate.Enabled';

const DEFAULTS: Readonly<Record<FeatureFlagName, boolean>> = {
    'Loop.RunStateGate.Enabled': false,
};

interface FlagBridge {
    featureFlags?: Partial<Record<FeatureFlagName, boolean>>;
}

function readOverride(flag: FeatureFlagName): boolean | null {
    if (typeof window === 'undefined') {
        return null;
    }
    const sdk = (window as unknown as { marco?: FlagBridge }).marco;
    if (!sdk || !sdk.featureFlags) {
        return null;
    }
    const override = sdk.featureFlags[flag];
    if (override === true || override === false) {
        return override;
    }
    return null;
}

export function isFeatureFlagEnabled(flag: FeatureFlagName): boolean {
    const override = readOverride(flag);
    if (override !== null) {
        return override;
    }
    return DEFAULTS[flag];
}

/** Test-only: seed an override on window.marco.featureFlags. */
export function setFeatureFlagOverrideForTests(flag: FeatureFlagName, value: boolean | null): void {
    if (typeof window === 'undefined') {
        return;
    }
    const root = window as unknown as { marco?: FlagBridge };
    const sdk = root.marco ?? {};
    const flags = sdk.featureFlags ?? {};
    if (value === null) {
        delete flags[flag];
    } else {
        flags[flag] = value;
    }
    sdk.featureFlags = flags;
    root.marco = sdk;
}
