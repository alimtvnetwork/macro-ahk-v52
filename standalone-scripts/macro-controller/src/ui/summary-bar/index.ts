/**
 * Public surface of the summary-bar module. The DOM component shell is
 * wired in Issue 125 Task 3 (panel mount); this barrel re-exports only the
 * pure aggregator + types so unit tests and selectors can depend on it
 * without pulling in DOM code.
 */

export { computeDashboardSummary, computeSummaryDetails, type DisplayKindResolver } from './compute-summary';
export { PRO_EXPIRING_KINDS, type DashboardSummary, type SummaryDetails } from './types';
