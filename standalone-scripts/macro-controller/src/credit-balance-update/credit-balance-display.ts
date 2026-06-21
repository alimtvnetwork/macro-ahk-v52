import type { CreditBalance } from './credit-balance-types';

function rounded(value: number): number {
    return Math.max(0, Math.round(value || 0));
}

function sumGranted(balance: CreditBalance): number {
    return balance.grantTypeBalances.reduce(function (total, row): number {
        return total + rounded(row.granted);
    }, 0);
}

function sumRemaining(balance: CreditBalance): number {
    return balance.grantTypeBalances.reduce(function (total, row): number {
        return total + rounded(row.remaining);
    }, 0);
}

export function resolveDisplayTotal(balance: CreditBalance): number {
    return Math.max(rounded(balance.totalGranted), rounded(balance.dailyLimit), sumGranted(balance));
}

export function resolveDisplayAvailable(balance: CreditBalance): number {
    return Math.max(rounded(balance.totalRemaining), rounded(balance.dailyRemaining), sumRemaining(balance));
}