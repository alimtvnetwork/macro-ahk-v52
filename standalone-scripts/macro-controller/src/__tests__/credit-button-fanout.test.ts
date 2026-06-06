/**
 * Regression — v3.55.x 💰 Credits button fan-out for Free / Lite / Cancelled / pro_0.
 *
 * Root cause (RCA 2026-06-06 #4):
 * `batchRefreshProOneCreditBalances` only covers pro_1. Workspaces on free /
 * ktlo / cancelled / pro_0 without inline credits never receive their
 * `/credit-balance` follow-up, so their bars stay at the skeleton dash even
 * after the user clicks 💰 Credits.
 *
 * Static guard: `executeCreditFetch` MUST
 *   1. iterate `loopCreditState.perWorkspace`,
 *   2. skip plans for which `shouldFetchCreditBalanceForPlan` is false,
 *   3. skip workspaces with `hasInlineCredits(ws)` true,
 *   4. call `requestCredits(w)` for the remainder,
 *   5. only clear the loading state once both the pro_1 batch AND the
 *      fan-out have settled (Promise.all([...]).finally).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '..', 'ui', 'panel-controls.ts');
const SOURCE = readFileSync(SRC, 'utf8');

function getExecuteCreditFetchBody(): string {
    const start = SOURCE.indexOf('function executeCreditFetch');
    expect(start, 'executeCreditFetch must exist').toBeGreaterThan(-1);
    const rest = SOURCE.slice(start);
    const endRel = rest.indexOf('\n}\n');
    return endRel === -1 ? rest : rest.slice(0, endRel + 2);
}

describe('💰 Credits button — enrichment fan-out contract', () => {
    const body = getExecuteCreditFetchBody();

    it('imports requestCredits and hasInlineCredits from the controller', () => {
        expect(SOURCE).toMatch(
            /import\s*\{[^}]*\brequestCredits\b[^}]*\bhasInlineCredits\b[^}]*\}\s*from\s*['"]\.\.\/credit-balance-update\/credit-fetch-controller['"]/,
        );
    });

    it('iterates perWorkspace and skips plans that do not need /credit-balance', () => {
        expect(body).toMatch(/for\s*\(\s*const\s+\w+\s+of\s+loopCreditState\.perWorkspace/);
        expect(body).toMatch(/shouldFetchCreditBalanceForPlan\s*\(/);
    });

    it('skips workspaces that already have inline credits', () => {
        expect(body).toMatch(/hasInlineCredits\s*\(/);
    });

    it('calls requestCredits for each non-skipped workspace', () => {
        expect(body).toMatch(/await\s+requestCredits\s*\(/);
    });

    it('only clears loading after BOTH pro_1 batch AND fan-out settle', () => {
        expect(body).toMatch(/Promise\.all\(\s*\[\s*proOneRefresh\s*,\s*enrichmentFanOut\s*\]\s*\)\.finally\(/);
        expect(body).toMatch(/setCreditBtnLoading\s*\(\s*\w+\.creditBtn\s*,\s*false\s*\)/);
    });

    it('logs fan-out failures via the namespace logger with CODE-RED schema (Path/Missing/Reason + WorkspaceId)', () => {
        expect(body).toMatch(/logError\s*\(\s*['"]CreditBalanceUpdate\.fanOut['"]/);
        expect(body).toMatch(/Path:\s*standalone-scripts\/macro-controller\/src\/ui\/panel-controls\.ts/);
        expect(body).toMatch(/Missing item:\s*\/credit-balance result for workspace/);
        expect(body).toMatch(/Reason:\s*requestCredits rejected/);
        expect(body).toMatch(/WorkspaceId=/);
    });
});
