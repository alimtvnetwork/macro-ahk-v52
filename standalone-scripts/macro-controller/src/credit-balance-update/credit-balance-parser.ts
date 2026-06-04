import { mapGrantTypeFromWire } from './grant-type-mapper';
import { logCreditParseWarning } from './credit-balance-logger';
import type { CreditBalance, ExpiringGrant, GrantTypeBalance } from './credit-balance-types';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };
export type CreditBalanceWire = { readonly [key: string]: JsonValue };

export class CreditBalanceParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CreditBalanceParseError';
    }
}

function isRecord(value: JsonValue | undefined): value is CreditBalanceWire {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(raw: CreditBalanceWire, key: string): number {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    logCreditParseWarning('Missing or invalid numeric field "' + key + '" — defaulting to 0');
    return 0;
}

function readString(raw: CreditBalanceWire, key: string): string {
    const value = raw[key];
    return typeof value === 'string' ? value : '';
}

function parseGrantTypeBalance(value: JsonValue): GrantTypeBalance | null {
    if (!isRecord(value)) {
        return null;
    }
    return {
        grantType: mapGrantTypeFromWire(readString(value, 'grant_type')),
        granted: readNumber(value, 'granted'),
        remaining: readNumber(value, 'remaining'),
    };
}

function parseExpiringGrant(value: JsonValue): ExpiringGrant | null {
    if (!isRecord(value)) {
        return null;
    }
    return {
        grantType: mapGrantTypeFromWire(readString(value, 'grant_type')),
        remaining: readNumber(value, 'remaining'),
        expiresAt: readString(value, 'expires_at'),
    };
}

function parseGrantTypeBalances(raw: CreditBalanceWire): ReadonlyArray<GrantTypeBalance> {
    const values = raw.grant_type_balances;
    if (!Array.isArray(values)) {
        return [];
    }
    const balances: GrantTypeBalance[] = [];
    for (const value of values) {
        const parsed = parseGrantTypeBalance(value);
        if (parsed) {
            balances.push(parsed);
        }
    }
    return balances;
}

function parseExpiringGrants(raw: CreditBalanceWire): ReadonlyArray<ExpiringGrant> {
    const values = raw.expiring_grants;
    if (!Array.isArray(values)) {
        return [];
    }
    const grants: ExpiringGrant[] = [];
    for (const value of values) {
        const parsed = parseExpiringGrant(value);
        if (parsed) {
            grants.push(parsed);
        }
    }
    return grants;
}

export function parseCreditBalance(raw: CreditBalanceWire): CreditBalance {
    if (!isRecord(raw)) {
        throw new CreditBalanceParseError('Expected credit-balance response object');
    }

    return {
        totalRemaining: readNumber(raw, 'total_remaining'),
        totalGranted: readNumber(raw, 'total_granted'),
        dailyRemaining: readNumber(raw, 'daily_remaining'),
        dailyLimit: readNumber(raw, 'daily_limit'),
        totalBillingPeriodUsed: readNumber(raw, 'total_billing_period_used'),
        expiringGrants: parseExpiringGrants(raw),
        grantTypeBalances: parseGrantTypeBalances(raw),
    };
}
