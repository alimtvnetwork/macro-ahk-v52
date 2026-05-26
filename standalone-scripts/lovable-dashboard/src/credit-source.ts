/**
 * Spec: spec/21-app/01-chrome-extension/home-screen-modification/07-pro-label-credit-append.md
 * Reuse contract: official MacroController CreditsApi. NO duplicate credit math,
 * NO `_internal` access.
 *
 * Bridge contract (api-namespace.ts, CreditsApi):
 *   window.RiseupAsiaMacroExt.Projects.MacroController.api.credits.fetch()
 *     — fire-and-forget refresh; updates the module-level loopCreditState.
 *   window.RiseupAsiaMacroExt.Projects.MacroController.api.credits.getState()
 *     — returns LoopCreditState | null. `perWorkspace` is the keyed array.
 *
 * If the namespace isn't yet hydrated (SDK script hasn't run, or the user
 * is on the home screen without macro-controller injected), this returns
 * an empty map and `workspace-dictionary` falls back to 0/0.
 */
import { logError } from "./logger";
import type { CreditMap, CreditPair } from "./types";

/**
 * Local structural subset of macro-controller's WorkspaceCredit / LoopCreditState.
 * Only the fields this project actually consumes are declared, so we depend on
 * the bridge contract rather than on macro-controller's internal types.
 * Keep in sync with `api.credits.getState()` in
 * `standalone-scripts/macro-controller/src/types/credit-types.ts`.
 */
interface WorkspaceCredit {
    name: string;
    available: number;
    totalCredits: number;
}

interface LoopCreditState {
    perWorkspace: WorkspaceCredit[];
}

interface CreditsApiShape {
    fetch?: (isRetry?: boolean) => void;
    getState?: () => LoopCreditState | null;
}

interface BridgeWindow {
    RiseupAsiaMacroExt?: {
        Projects?: { MacroController?: { api?: { credits?: CreditsApiShape } } };
    };
}

export function toCreditPair(wc: WorkspaceCredit): CreditPair {
    return { available: wc.available, total: wc.totalCredits };
}

export async function loadCreditMap(): Promise<CreditMap> {
    try {
        triggerRefresh();
        return readMap();
    } catch (caught) {
        logError("CreditSource.load", caught);
        return new Map();
    }
}

function getCreditsApi(): CreditsApiShape | null {
    const w = window as unknown as BridgeWindow;
    return w.RiseupAsiaMacroExt?.Projects?.MacroController?.api?.credits ?? null;
}

function triggerRefresh(): void {
    getCreditsApi()?.fetch?.();
}

function readMap(): CreditMap {
    const state = getCreditsApi()?.getState?.() ?? null;
    const credits = state?.perWorkspace ?? [];
    const map: CreditMap = new Map();
    for (const wc of credits) {
        map.set(wc.name, toCreditPair(wc));
    }
    return map;
}
