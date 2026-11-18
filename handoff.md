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

## 2026-11-19 00:30 · Stage-1 MVP: M1–M3 done, M4 half done
- **Done:** M1 layout, M2 board (graveyard, edge cases, Stockfish lite + eval bar), M3 repertoire in board + save back, M4 T3 walk / T4 import gate / T15 runs. All merged + pushed, `main@fd04a4a`.
- **In progress:** nothing uncommitted.
- **Next step:** T16 (Stockfish verdict on findings, add to repertoire, dismiss, open in board), then M5 builder (graph library is a 🟠 for Harry).
- **Open question for Harry:** bulk runs include every imported games folder, e.g. `lichess/theoneandonlylipika` (someone else's?). Restrict to chosen accounts?
- **Gotchas:** `tsc` before every commit with `set -o pipefail` (a piped `| head` once hid a failure). Real data uses chessgraph `childIds`: always read children via `childrenOf()`. Live tests that write data: back up `%APPDATA%/ChessBox/ChessBox-data` first and restore after. Dev app for screenshots: `npx electron-forge start -- --remote-debugging-port=9333` + Playwright `connectOverCDP` from the scratchpad; stopping the shell leaves forge/electron running, so kill them by command line containing `ChessBox\apps\desktop`.
- **Commands to run:** `./ctx.sh sync` · `cd apps/desktop && npm test` · type-check `npx --prefix apps/desktop tsc --noEmit -p tsconfig.json`

## 2026-11-18 17:20 · Workflow setup + cleanup
- **Done:** solo-agent-kit installed (branch mode). Committed the WIP (f317609), cleanup T1 (f7335b2). Filled the charter; migrated TODO/MASTER/ARCHITECTURE into plan/tasks/decisions.
- **In progress:** Harry is writing a feature md (1.0 goal, deadline, Stockfish, new features). Next session: turn it into tasks, decisions and plan milestones.
- **Next step:** read Harry's md and fill the Goal / deadline / Done-when / gates / milestones blanks; then T2 (pick a test runner: a 🟠 decision).
- **Gotchas:** never open any .env. Commits are Harry's `TYPE: message` style, with no Claude trailer. `main` is 2 commits ahead of origin, not pushed. The submodule has uncommitted edits of Harry's inside it; leave them alone.
- **Commands to run:** `./ctx.sh sync` · type-check `npx --prefix apps/desktop tsc --noEmit -p tsconfig.json`
