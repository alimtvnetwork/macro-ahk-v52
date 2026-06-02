# UI State Diagrams

## Run banner

```
                +---------+
                |  Idle   |
                +----+----+
                     | StartMacro
                     v
                +---------+   PauseMacro    +---------+
                | Running |---------------->| Paused  |
                |         |<----------------|         |
                +----+----+   ResumeMacro   +----+----+
                     | StopMacro / RunAborted    | StopMacro
                     v                           v
                +---------+               +-----------+
                | Aborted |               |  Aborted  |
                +---------+               +-----------+
                     ^
                     | RunCompleted
                +----+----+
                |Completed|
                +---------+
```

## Variable-input dialog

```
Hidden → Validating → Submitting → Hidden
   ^         |             |
   |         v             v
   +--- Cancelled    SubmitFailed → Validating
```

## Macros tab

```
Empty (no macros) ──Create──> Editing ──Save──> List
                                ^                  |
                                +─── Edit ─────────+
                                +─── Duplicate ────+
List ──Run──> RunPanel
List ──Delete──> ConfirmDialog ──Confirm──> List
```

## Filter chips

Independent toggle states; `OR` within a chip group, `AND` across groups. No diagram — pure boolean.
