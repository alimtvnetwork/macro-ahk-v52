# Examples Bundle

Six fully-resolved examples covering the variable system.

## 1. Simple substitution

```
Template: "Audit {{ TargetFolder }}."
Resolved: TargetFolder="src/"
Output:   "Audit src/."
```

## 2. Integer with Min/Max

```
Decl:     { Name: "Depth", Type: "integer", Default: 3, Min: 1, Max: 10 }
Template: "Depth: {{ Depth }}"
Input:    Depth=7   →  "Depth: 7"
Input:    Depth=15  →  abort  Reason="VarOutOfRange"  ReasonDetail="Depth=15 max=10"
```

## 3. Enum

```
Decl:     { Name: "Mode", Type: "enum", Values: ["fast","thorough"], Required: true }
Input:    Mode="quick"  →  abort  Reason="VarEnumMismatch"
```

## 4. Sensitive masking

```
Decl:     { Name: "ApiToken", Type: "string", Sensitive: true, Required: true }
Template: "curl -H 'Authorization: Bearer {{ ApiToken }}' …"
Input:    ApiToken="abc123"
Sent to LLM: "curl -H 'Authorization: Bearer abc123' …"
In _log.jsonl: "curl -H 'Authorization: Bearer ***' …"
```

## 5. Waterfall — step beats macro

```
Macro.set-var:  Depth = 5
Step.Variables: { Depth: 9 }
Template:       "Depth: {{ Depth }}"
Output:         "Depth: 9"
```

## 6. Built-in `Now` re-renders per token

```
Template:
  Start: {{ Now }}
  End:   {{ Now }}
Output (one render):
  Start: 2026-06-02T14:30:01+08:00
  End:   2026-06-02T14:30:01+08:00
```

(Both resolve in the same `replace()` pass, so they share the same instant. To get a fresh timestamp later, render again in a new step.)
