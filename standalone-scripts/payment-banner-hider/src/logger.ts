/**
 * Payment Banner Hider logger shim.
 *
 * Feature code imports this helper instead of calling `console.error`
 * directly. The fallback remains isolated here so ESLint can allowlist the
 * logger implementation while keeping production source clean.
 */

function getNamespace(): RiseupAsiaMacroExtNamespace | undefined {
    if (typeof RiseupAsiaMacroExt === "undefined") {
        return undefined;
    }

    return RiseupAsiaMacroExt;
}

export function logPaymentBannerHiderError(
    functionName: string,
    message: string,
    error?: CaughtError,
): void {
    const logger = getNamespace()?.Logger;

    if (logger !== undefined) {
        logger.error(functionName, message, error);

        return;
    }

    if (error !== undefined) {
        console.error(`[${functionName}] ${message}`, error);

        return;
    }

    console.error(`[${functionName}] ${message}`);
}