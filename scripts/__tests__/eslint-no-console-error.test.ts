/**
 * eslint-no-console-error.test.ts — Batch C step 25.
 *
 * Smoke test for the `no-restricted-syntax` rule that bans bare
 * `console.error` outside the allowlist. Runs ESLint programmatically
 * against two tiny fixtures (one violating, one compliant) and asserts
 * the expected error / no-error outcome.
 */
import { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';

const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

const VIOLATING = `
export function broken() {
    try { /* noop */ } catch (err) {
        console.error("bad", err);
    }
}
`;

const COMPLIANT = `
import { logError } from "./hook-logger";
export function ok() {
    try { /* noop */ } catch (err) {
        logError("ok", "boom", err);
    }
}
`;

const DENYLIST_VIOLATING = `
export function readValue() {
    const val = "placeholder";
    return val;
}
`;

const DENYLIST_COMPLIANT = `
export function readValue() {
    const resolvedValue = "named";
    return resolvedValue;
}
`;

describe('no-restricted-syntax: console.error ban', () => {
    it('reports a violation in non-allowlisted file', async () => {
        const results = await eslint.lintText(VIOLATING, {
            filePath: 'src/hooks/__fixture-violating.ts',
        });
        const messages = results[0].messages.filter(
            (m) => m.ruleId === 'no-restricted-syntax'
        );
        expect(messages.length).toBeGreaterThanOrEqual(1);
        expect(messages[0].message).toContain('Logger.error');
    });

    it('allows the same code in an allowlisted file', async () => {
        const results = await eslint.lintText(VIOLATING, {
            filePath: 'src/background/bg-logger.ts',
        });
        const messages = results[0].messages.filter(
            (m) => m.ruleId === 'no-restricted-syntax'
        );
        expect(messages.length).toBe(0);
    });

    it('allows Logger.error usage everywhere', async () => {
        const results = await eslint.lintText(COMPLIANT, {
            filePath: 'src/hooks/__fixture-compliant.ts',
        });
        const messages = results[0].messages.filter(
            (m) => m.ruleId === 'no-restricted-syntax'
        );
        expect(messages.length).toBe(0);
    });
});

describe('id-denylist: placeholder identifier ban', () => {
    it('reports the staged val placeholder identifier', async () => {
        const results = await eslint.lintText(DENYLIST_VIOLATING, {
            filePath: 'src/hooks/__fixture-denylist.ts',
        });
        const messages = results[0].messages.filter(
            (m) => m.ruleId === 'id-denylist'
        );
        expect(messages.length).toBeGreaterThanOrEqual(1);
        expect(messages[0].message).toContain('val');
    });

    it('allows descriptive replacement names', async () => {
        const results = await eslint.lintText(DENYLIST_COMPLIANT, {
            filePath: 'src/hooks/__fixture-denylist-ok.ts',
        });
        const messages = results[0].messages.filter(
            (m) => m.ruleId === 'id-denylist'
        );
        expect(messages.length).toBe(0);
    });
});
