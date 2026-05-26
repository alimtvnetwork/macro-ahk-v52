/**
 * Spec: spec/21-app/01-chrome-extension/home-screen-modification/02-url-activation-guard.md
 *
 * STRICT exact-match — DASHBOARD only.
 *
 * History: `ROOT` and `ROOT_SLASH` were removed per user directive
 * ("It should be only the dashboard from now on"). Activation on the bare
 * lovable.dev origin caused unwanted mutations on non-dashboard pages.
 * Any mutation here is a behavior change — update spec file 02 first,
 * then this enum.
 */
export enum AllowedHomeUrl {
    DASHBOARD = "https://lovable.dev/dashboard",
}

export const ALLOWED_HOME_URLS: readonly string[] = Object.values(AllowedHomeUrl);

