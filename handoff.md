# ChessBox: handoff notes (newest first)

For the next session. One entry per handoff, at most ~15 lines.

```
## <YYYY-MM-DD HH:MM> · <what this session was>
- **Done:** …
- **In progress:** <file, function, what's left>
- **Next step:** <the exact next action>
- **Gotchas:** …
- **Commands to run:** …
```

---

## 2026-11-18 17:20 · Workflow setup + cleanup
- **Done:** solo-agent-kit installed (branch mode). Committed the WIP (f317609), cleanup T1 (f7335b2). Filled the charter; migrated TODO/MASTER/ARCHITECTURE into plan/tasks/decisions.
- **In progress:** Harry is writing a feature md (1.0 goal, deadline, Stockfish, new features). Next session: turn it into tasks, decisions and plan milestones.
- **Next step:** read Harry's md and fill the Goal / deadline / Done-when / gates / milestones blanks; then T2 (pick a test runner: a 🟠 decision).
- **Gotchas:** never open any .env. Commits are Harry's `TYPE: message` style, with no Claude trailer. `main` is 2 commits ahead of origin, not pushed. The submodule has uncommitted edits of Harry's inside it; leave them alone.
- **Commands to run:** `./ctx.sh sync` · type-check `npx --prefix apps/desktop tsc --noEmit -p tsconfig.json`
