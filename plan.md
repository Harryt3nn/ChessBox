# {{Project}}: plan

A bare § means this file. `tasks.md` holds the ranked work; `decisions.md` holds the why.

## 0. NOW (read every session)
**Decisions in force** (one line each, pointing at `decisions.md`):
- {{D1: …}}

**Pending / Unconfirmed** (*not decided*; each with the condition that decides it):
- {{maybe X, decide when Y}}

**Active gates** (date · what must work · what we fall back to if it doesn't):
- {{…}}

## 1. Summary
{{One paragraph. Mirror of the top of `CLAUDE.md`.}}

## 2. Goals, non-goals, success metrics
- **Goals:** {{…}}
- **Non-goals:** {{…}}
- **Done when:** {{a measurable check}}

## 3. Users and main flow
{{Who uses it, and the step-by-step happy path.}}

## 4. Requirements
| ID | Requirement | Status |
|---|---|---|
| R1 | {{…}} | Planned |

## 5. Architecture
{{Diagram or a short list of components and how data flows between them.}}

### 5.1 Contracts (what a caller can rely on; changing one is a 🟠 decision)
```
{{interfaces, schemas, config semantics}}
```

## 6. Failure modes and fallbacks
| Failure | Detection | Fallback |
|---|---|---|
| {{…}} | {{…}} | {{…}} |

## 7. Milestones
{{Ordered milestones, each with its gate.}}

## 8. Open questions
- {{…}}

## 9. References
- {{…}}
