Code formatting and logic structure must adhere to four specific rules: 
1) CQ14: All 'if' statements must use curly braces and multi-line formatting (no one-liners), with the body on its own line. 
2) CQ15: Mandatory blank lines must be placed before and after 'if' blocks, and before 'return' statements. 
3) Rule 3 (Boolean Extraction): Complex inline conditions (multi-part boolean logic) must be extracted into descriptive named constants before the 'if' statement to improve readability and maintainability.
4) Defensive Property Access: UI components must use optional chaining ('?.') and nullish coalescing ('??') when accessing array lengths or nested properties from potentially incomplete data structures (e.g., 'project.scripts?.length ?? 0') to prevent runtime crashes.
