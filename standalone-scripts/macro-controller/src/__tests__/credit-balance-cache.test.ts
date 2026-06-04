import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { CreditFetchOutcome } from '../credit-balance-update/credit-fetch-outcome';
import type { CreditFetchResult } from '../credit-balance-update/credit-balance-types';
import {
    clearCreditBalanceUpdateMemoryCache,
    CREDIT_BALANCE_UPDATE_IDB_STORE,
    invalidateCreditBalanceUpdateCache,
    makeCachedResult,
    readCreditBalanceUpdateCache,
    readCreditBalanceUpdateCacheSync,
    writeCreditBalanceUpdateCache,
} from '../credit-balance-update/credit-balance-cache';

vi.mock('../error-utils', () => ({
    logError: vi.fn(),
}));

function result(fetchedAt = 1_000): CreditFetchResult {
    return {
        outcome: CreditFetchOutcome.ApiHit,
        balance: {
            totalRemaining: 5,
            totalGranted: 5,
            dailyRemaining: 5,
            dailyLimit: 5,
            totalBillingPeriodUsed: 0,
            expiringGrants: [],
            grantTypeBalances: [],
        },
        fetchedAt,
        sourceUrl: 'https://api.example.test/workspaces/ws/credit-balance',
        errorDetail: null,
    };
}

beforeEach(async () => {
    clearCreditBalanceUpdateMemoryCache();
    await indexedDB.deleteDatabase('macro_controller_credit_balance_update_v1');
});

describe('credit-balance-update cache', () => {
    it('returns fresh memory cache entries inside TTL', async () => {
        await writeCreditBalanceUpdateCache('ws_1', result(), 1_000, 10_000);
        expect(readCreditBalanceUpdateCacheSync('ws_1', 10_999)?.balance?.totalRemaining).toBe(5);
    });

    it('drops memory cache entries after TTL boundary', async () => {
        await writeCreditBalanceUpdateCache('ws_1', result(), 1_000, 10_000);
        expect(readCreditBalanceUpdateCacheSync('ws_1', 11_000)).toBeNull();
    });

    it('hydrates from IndexedDB after memory cache is cleared', async () => {
        await writeCreditBalanceUpdateCache('ws_1', result(), 10_000, 20_000);
        clearCreditBalanceUpdateMemoryCache();

        const cached = await readCreditBalanceUpdateCache('ws_1', 20_500);

        expect(cached?.balance?.dailyRemaining).toBe(5);
        expect(CREDIT_BALANCE_UPDATE_IDB_STORE).toBe('entries_v2_ktlo_free_cancelled');
    });

    it('invalidates memory and IndexedDB rows', async () => {
        await writeCreditBalanceUpdateCache('ws_1', result(), 10_000, 20_000);

        await invalidateCreditBalanceUpdateCache('ws_1');

        expect(await readCreditBalanceUpdateCache('ws_1', 20_500)).toBeNull();
    });

    it('marks cached balance result as ApiCacheHit', () => {
        expect(makeCachedResult(result()).outcome).toBe(CreditFetchOutcome.ApiCacheHit);
    });
});
