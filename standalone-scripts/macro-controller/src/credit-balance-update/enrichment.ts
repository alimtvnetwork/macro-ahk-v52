import type { WorkspaceCredit } from '../types';
import { logError } from '../error-utils';
import { CreditFetchOutcome } from './credit-fetch-outcome';
import { requestCredits } from './credit-fetch-controller';

function snapshot(ws: WorkspaceCredit): string {
    return [
        ws.available,
        ws.totalCredits,
        ws.totalCreditsUsed,
        ws.dailyFree,
        ws.dailyLimit,
        ws.dailyUsed,
    ].join('|');
}

async function enrichOne(ws: WorkspaceCredit): Promise<boolean> {
    const before = snapshot(ws);
    try {
        const result = await requestCredits(ws);
        if (result.outcome === CreditFetchOutcome.Skipped || result.outcome === CreditFetchOutcome.InlineHit) {
            return false;
        }
        return before !== snapshot(ws);
    } catch (caught: CaughtError) {
        logError(
            'CreditBalanceUpdate.enrichment',
            'Path: standalone-scripts/macro-controller/src/credit-balance-update/enrichment.ts. Missing item: enriched credit-balance row for workspace ' + ws.id + '. Reason: requestCredits threw before returning a typed outcome.',
            caught,
        );
        return false;
    }
}

export async function enrichCreditBalanceUpdateWorkspaces(perWs: WorkspaceCredit[]): Promise<number> {
    const results = await Promise.all(perWs.map(enrichOne));
    return results.filter(Boolean).length;
}
