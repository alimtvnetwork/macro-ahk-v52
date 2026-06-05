/**
 * Marco Extension — Condition Step Routing (Spec 18 §4.2 + §5)
 *
 * Pure helpers for resolving the `OnTrue` / `OnFalse` route of a
 * StepKindId=8 Condition step into a concrete cursor move within the
 * current step group, with a hard cap on jumps to detect loops.
 */

export type RouteAction =
    | { readonly Kind: "Continue" }
    | { readonly Kind: "GoToLabel"; readonly Label: string }
    | { readonly Kind: "GoToStepId"; readonly StepId: number }
    | { readonly Kind: "RunGroup"; readonly StepGroupId: number }
    | { readonly Kind: "EndRun"; readonly Outcome: "Pass" | "Fail" };

export const MAX_ROUTE_JUMPS = 256;

export interface RouteableStep {
    readonly StepId: number;
    readonly Label: string;
}

export type RouteResolution =
    | { readonly Kind: "Cursor"; readonly NextIndex: number; readonly JumpsUsed: number }
    | { readonly Kind: "RunGroup"; readonly StepGroupId: number; readonly NextIndex: number; readonly JumpsUsed: number }
    | { readonly Kind: "End"; readonly Outcome: "Pass" | "Fail"; readonly JumpsUsed: number }
    | { readonly Kind: "Error"; readonly Reason: "InvalidRouteTarget" | "RouteLoopDetected"; readonly Detail: string };

export interface RouteContext {
    readonly Steps: ReadonlyArray<RouteableStep>;
    readonly CurrentIndex: number;
    readonly JumpsUsed: number;
}

export function resolveRoute(action: RouteAction, routeContext: RouteContext): RouteResolution {
    const nextJumps = routeContext.JumpsUsed + 1;
    const isRouteLimitExceeded = nextJumps > MAX_ROUTE_JUMPS;
    if (isRouteLimitExceeded) {
        return createRouteLoopError();
    }

    return resolveAllowedRoute(action, routeContext, nextJumps);
}

function resolveAllowedRoute(action: RouteAction, routeContext: RouteContext, nextJumps: number): RouteResolution {
    switch (action.Kind) {
        case "Continue":
            return { Kind: "Cursor", NextIndex: routeContext.CurrentIndex + 1, JumpsUsed: nextJumps };

        case "EndRun":
            return { Kind: "End", Outcome: action.Outcome, JumpsUsed: nextJumps };

        case "GoToLabel":
            return resolveLabelRoute(action.Label, routeContext.Steps, nextJumps);

        case "GoToStepId":
            return resolveStepIdRoute(action.StepId, routeContext.Steps, nextJumps);

        case "RunGroup":
            return {
                Kind: "RunGroup",
                StepGroupId: action.StepGroupId,
                NextIndex: routeContext.CurrentIndex + 1,
                JumpsUsed: nextJumps,
            };
    }
}

function resolveLabelRoute(label: string, steps: ReadonlyArray<RouteableStep>, nextJumps: number): RouteResolution {
    const routeIndex = steps.findIndex((step) => step.Label === label);
    const isRouteTargetMissing = routeIndex < 0;
    if (isRouteTargetMissing) {
        return createInvalidRouteTarget(`No step with Label='${label}' in current group`);
    }

    return { Kind: "Cursor", NextIndex: routeIndex, JumpsUsed: nextJumps };
}

function resolveStepIdRoute(stepId: number, steps: ReadonlyArray<RouteableStep>, nextJumps: number): RouteResolution {
    const routeIndex = steps.findIndex((step) => step.StepId === stepId);
    const isRouteTargetMissing = routeIndex < 0;
    if (isRouteTargetMissing) {
        return createInvalidRouteTarget(`No step with StepId=${stepId} in current group`);
    }

    return { Kind: "Cursor", NextIndex: routeIndex, JumpsUsed: nextJumps };
}

function createInvalidRouteTarget(detail: string): RouteResolution {
    return { Kind: "Error", Reason: "InvalidRouteTarget", Detail: detail };
}

function createRouteLoopError(): RouteResolution {
    return {
        Kind: "Error",
        Reason: "RouteLoopDetected",
        Detail: `Route jumps exceeded ${MAX_ROUTE_JUMPS}`,
    };
}
