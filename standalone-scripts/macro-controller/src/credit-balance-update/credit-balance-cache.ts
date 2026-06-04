import { logError } from '../error-utils';
import { CreditFetchOutcome } from './credit-fetch-outcome';
import type { CreditBalance, CreditFetchResult } from './credit-balance-types';

const DB_NAME = 'macro_controller_credit_balance_update_v1';
const DB_VERSION = 1;
const STORE_NAME = 'entries_v2_ktlo_free_cancelled';
const DEFAULT_TTL_MS = 10 * 60_000;

interface CreditBalanceCacheEntry {
    readonly workspaceId: string;
    readonly result: CreditFetchResult;
    readonly storedAtMs: number;
    readonly expiresAtMs: number;
}

const memoryCache = new Map<string, CreditBalanceCacheEntry>();

function hasIndexedDb(): boolean {
    return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
    return new Promise(function (resolve, reject): void {
        if (!hasIndexedDb()) {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = function (): void {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'workspaceId' });
            }
        };
        request.onsuccess = function (): void { resolve(request.result); };
        request.onerror = function (): void { reject(request.error || new Error('IndexedDB open failed')); };
    });
}

function isFresh(entry: CreditBalanceCacheEntry, nowMs: number): boolean {
    return entry.expiresAtMs > nowMs;
}

function buildEntry(workspaceId: string, result: CreditFetchResult, ttlMs: number, nowMs: number): CreditBalanceCacheEntry {
    return {
        workspaceId,
        result,
        storedAtMs: nowMs,
        expiresAtMs: nowMs + Math.max(0, ttlMs),
    };
}

function readStoreEntry(db: IDBDatabase, workspaceId: string): Promise<CreditBalanceCacheEntry | null> {
    return new Promise(function (resolve): void {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(workspaceId);
        request.onsuccess = function (): void { resolve((request.result as CreditBalanceCacheEntry | undefined) ?? null); };
        request.onerror = function (): void { resolve(null); };
    });
}

function writeStoreEntry(db: IDBDatabase, entry: CreditBalanceCacheEntry): Promise<void> {
    return new Promise(function (resolve, reject): void {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(entry);
        tx.oncomplete = function (): void { resolve(); };
        tx.onerror = function (): void { reject(tx.error || new Error('IndexedDB put failed')); };
    });
}

function deleteStoreEntry(db: IDBDatabase, workspaceId: string): Promise<void> {
    return new Promise(function (resolve, reject): void {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(workspaceId);
        tx.oncomplete = function (): void { resolve(); };
        tx.onerror = function (): void { reject(tx.error || new Error('IndexedDB delete failed')); };
    });
}

export function writeCreditBalanceUpdateCache(
    workspaceId: string,
    result: CreditFetchResult,
    ttlMs: number = DEFAULT_TTL_MS,
    nowMs: number = Date.now(),
): void {
    if (!workspaceId) {
        return;
    }
    const entry = buildEntry(workspaceId, result, ttlMs, nowMs);
    memoryCache.set(workspaceId, entry);
    openDb()
        .then(function (db): Promise<void> { return writeStoreEntry(db, entry); })
        .catch(function (caught: CaughtError): void {
            logError(
                'CreditBalanceUpdate.cache.write',
                'Path: standalone-scripts/macro-controller/src/credit-balance-update/credit-balance-cache.ts. Missing item: IndexedDB store ' + STORE_NAME + '. Reason: failed to persist credit-balance cache for workspace ' + workspaceId + '.',
                caught,
            );
        });
}

export function readCreditBalanceUpdateCacheSync(
    workspaceId: string,
    nowMs: number = Date.now(),
): CreditFetchResult | null {
    const entry = memoryCache.get(workspaceId);
    if (!entry || !isFresh(entry, nowMs)) {
        return null;
    }
    return entry.result;
}

export async function readCreditBalanceUpdateCache(
    workspaceId: string,
    nowMs: number = Date.now(),
): Promise<CreditFetchResult | null> {
    const memory = readCreditBalanceUpdateCacheSync(workspaceId, nowMs);
    if (memory) {
        return memory;
    }
    try {
        const db = await openDb();
        const entry = await readStoreEntry(db, workspaceId);
        if (!entry || !isFresh(entry, nowMs)) {
            return null;
        }
        memoryCache.set(workspaceId, entry);
        return entry.result;
    } catch (caught: CaughtError) {
        logError(
            'CreditBalanceUpdate.cache.read',
            'Path: standalone-scripts/macro-controller/src/credit-balance-update/credit-balance-cache.ts. Missing item: IndexedDB store ' + STORE_NAME + '. Reason: failed to read credit-balance cache for workspace ' + workspaceId + '.',
            caught,
        );
        return null;
    }
}

export async function invalidateCreditBalanceUpdateCache(workspaceId: string): Promise<void> {
    memoryCache.delete(workspaceId);
    try {
        const db = await openDb();
        await deleteStoreEntry(db, workspaceId);
    } catch (caught: CaughtError) {
        logError(
            'CreditBalanceUpdate.cache.invalidate',
            'Path: standalone-scripts/macro-controller/src/credit-balance-update/credit-balance-cache.ts. Missing item: IndexedDB store ' + STORE_NAME + '. Reason: failed to delete cache for workspace ' + workspaceId + '.',
            caught,
        );
    }
}

export function clearCreditBalanceUpdateMemoryCache(): void {
    memoryCache.clear();
}

export function makeCachedResult(result: CreditFetchResult): CreditFetchResult {
    if (!result.balance) {
        return result;
    }
    return {
        outcome: CreditFetchOutcome.ApiCacheHit,
        balance: result.balance,
        fetchedAt: result.fetchedAt,
        sourceUrl: result.sourceUrl,
        errorDetail: result.errorDetail,
    };
}

export function buildInlineResult(balance: CreditBalance, sourceUrl: string): CreditFetchResult {
    return {
        outcome: CreditFetchOutcome.InlineHit,
        balance,
        fetchedAt: Date.now(),
        sourceUrl,
        errorDetail: null,
    };
}

export const CREDIT_BALANCE_UPDATE_CACHE_TTL_MS = DEFAULT_TTL_MS;
export const CREDIT_BALANCE_UPDATE_IDB_STORE = STORE_NAME;
