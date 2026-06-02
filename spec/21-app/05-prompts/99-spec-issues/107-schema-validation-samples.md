# Schema Validation Samples

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Purpose:** each of the 5 JSON schemas paired with a passing sample + a failing sample. Validator-ready.

## MacroDefinition (`json/10`)

PASS:
```json
{ "Slug": "spec-tighten", "Version": "1.0.0", "Title": "Tighten spec",
  "TargetScore": 100, "MaxLoops": 5,
  "Steps": [
    { "StepKindId": 3, "PromptSlug": "audit-spec" },
    { "StepKindId": 4, "PromptSlug": "fix-from-audit" },
    { "StepKindId": 5, "PromptSlug": "final-audit" },
    { "StepKindId": 6, "GotoStep": 1 }
  ]
}
```

FAIL (StepKindId out of range):
```json
{ "Slug": "x", "Version": "1.0.0", "Title": "x", "Steps": [{ "StepKindId": 99 }] }
```

## RunState (`json/11`)

PASS:
```json
{ "RunId": "9f3e0a3a-1c2b-4d8a-9f0e-1234567890ab", "Slug": "x",
  "Status": "Running", "StepIndex": 0, "LastCompletedStepIndex": -1,
  "LoopIteration": 0, "Variables": {}, "Score": null, "Reason": null,
  "ReasonDetail": null, "StartedAt": "2026-06-02T14:30:00+08:00",
  "UpdatedAt": "2026-06-02T14:30:00+08:00", "SchemaVersion": 1 }
```

FAIL (bad Status):
```json
{ "RunId": "9f3e...", "Slug": "x", "Status": "Zombie", "StepIndex": 0, "StartedAt": "2026-06-02T14:30:00+08:00", "SchemaVersion": 1 }
```

## AuditOutput (`json/12`)

PASS:
```json
{ "RunId": "9f3e0a3a-1c2b-4d8a-9f0e-1234567890ab",
  "GeneratedAt": "2026-06-02T14:35:00+08:00",
  "Score": 87, "TargetScore": 100, "Findings": [],
  "SchemaVersion": 1 }
```

FAIL (Score=150):
```json
{ "RunId": "9f3e...", "GeneratedAt": "...", "Score": 150, "Findings": [], "SchemaVersion": 1 }
```

## MacroEvent (`json/13`)

PASS:
```json
{ "Type": "ScoreParsed", "RunId": "9f3e0a3a-1c2b-4d8a-9f0e-1234567890ab",
  "At": "2026-06-02T14:35:01+08:00", "Score": 87 }
```

FAIL (unknown Type):
```json
{ "Type": "WhoKnows", "RunId": "9f3e...", "At": "..." }
```

## PromptInfo (`json/14`)

PASS:
```json
{ "Slug": "audit-spec", "Title": "Audit Spec", "Version": "1.0.0",
  "Variables": [
    { "Name": "TargetFolder", "Type": "string", "Default": "spec/", "Required": true },
    { "Name": "Depth", "Type": "integer", "Default": 3, "Min": 1, "Max": 10 }
  ]
}
```

FAIL (lowercase variable Name):
```json
{ "Slug": "x", "Title": "x", "Version": "1.0.0",
  "Variables": [{ "Name": "targetFolder", "Type": "string" }] }
```

CI gate `schemas:lint` validates these samples on every push.
