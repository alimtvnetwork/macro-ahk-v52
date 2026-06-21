import { logError } from '../error-utils';
import { Plan } from './plan';

const LOG_SCOPE = 'CreditBalanceUpdate.plan';

export function mapPlanFromWire(wirePlan: string | null | undefined): Plan {
    const normalized = (wirePlan || '').trim().toLowerCase();

    if (!normalized) {
        return Plan.Unknown;
    }

    // `ktlo`, `lite`, `ktlo_2`, `ktlo_3`, … all collapse to Plan.Ktlo
    // (Lovable ships Lite tiers as `ktlo_<N>` on the wire — see workspace
    // payload `plan: "ktlo_2"`). Match prefix before exact-case switch.
    if (normalized === 'lite' || normalized === 'ktlo' || normalized.startsWith('ktlo_')) {
        return Plan.Ktlo;
    }

    switch (normalized) {
        case 'pro_0':
            return Plan.Pro0;
        case 'pro_1':
            return Plan.Pro1;
        case 'pro_3':
            return Plan.Pro3;
        case 'free':
            return Plan.Free;
        case 'cancelled':
        case 'canceled':
            return Plan.Cancelled;
        case 'business':
            return Plan.Business;
        case 'enterprise':
            return Plan.Enterprise;
        default:
            logError(
                LOG_SCOPE,
                '[CODE RED] Unknown workspace plan. Path: standalone-scripts/macro-controller/src/credit-balance-update/plan-mapper.ts. Missing item: Plan enum mapping for wire plan "' + normalized + '". Reason: unknown plan cannot safely trigger /credit-balance; falling back to inline fields.',
            );
            return Plan.Unknown;
    }
}

export function shouldFetchCreditBalanceForPlan(plan: Plan): boolean {
    return plan === Plan.Ktlo || plan === Plan.Free || plan === Plan.Cancelled || plan === Plan.Pro0;
}
