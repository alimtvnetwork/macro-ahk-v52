The project utilizes specific core type definitions to ensure compatibility across storage and UI layers:
1) 'SqlValue' includes primitive types and 'Uint8Array' for database operations.
2) 'JsonValue' is strictly defined to exclude 'undefined' values, ensuring compatibility with JSON tree components and standard serialization.
3) 'CaughtError' (in 'error-utils.ts') is the unified type for error handling, defined as 'unknown' to serve as the single entry point for all caught values while complying with the 'No Explicit Unknown' policy.
4) 'MergeableRecord' (in 'config-validator.ts') handles generic object merging.
