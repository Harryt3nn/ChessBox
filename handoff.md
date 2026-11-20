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

## 2026-11-20 20:30 · M6 done: settings page + server account features live
- **Done:** T18 merged (`main@bfa85b4`), T19 deployed (server `1717269`) and checked live by Harry on a new `dev` account (linked both sites, renamed, changed password, signed back in). D25 + D28 Verified.
- **In progress:** nothing; no open branches.
- **Next step:** T21 WeakPoints drills (D21–D23; adds `ts-fsrs` 5.4.2 to the desktop).
- **Gotchas:** see the 20:00 entry. D27 still needs revisiting before the API leaves Tailscale.
- **Commands to run:** `./ctx.sh sync` · `cd apps/desktop && npm test` · server `cd vendor/chessbox-server/apps/api && npm test`

## 2026-11-20 20:00 · T23 done, server hardening committed, T19 server built, T18 on a branch
- **Done:** T23 builder polish (`main@b34dc17`). Harry's server edits committed and merged with 3 Pi commits (`48a45b3`); T19 server side (`1717269`): change password / username, login + register limits, Vitest on the server (D24–D29). Submodule URL now `ChessBox-Server`.
- **In progress:** T18 settings page on branch `settings-page` (`bfa85b4`, pushed). Not merged: needs the server deployed, and nobody has seen it signed in.
- **Next step:** Harry deploys the server on the Pi (`git pull && docker compose --env-file ./apps/api/.env up --build -d`), signs in to the dev app, and checks Settings: link a site, rename, change password. Then merge `settings-page`, tick T18 + T19. Then T21 WeakPoints.
- **Gotchas:** the dev app came up **signed out** at 19:55 (server rejected the saved token: expired, or the deploy changed `JWT_SECRET`). npm in the server crashed with `reading 'location'`: workspace junctions had lower-case paths; fixed by recreating them. `createCaller` skips the API error formatter, so tests see raw zod messages. "magnus" is on the username blacklist. D27 must be revisited (plan §0 Pending).
- **Commands to run:** `./ctx.sh sync` · desktop `cd apps/desktop && npm test` · server `cd vendor/chessbox-server/apps/api && npm test`

## 2026-11-19 02:40 · Stage-1 MVP: M1–M5 done
- **Done:** M4 finished (T16 actions, T22 account picker) and M5 builder (T17). `main@bb66569`, pushed. 159 tests.
- **In progress:** nothing uncommitted. Dev app processes stopped.
- **Next step:** M6 needs Harry first: `vendor/chessbox-server` has his own uncommitted edits (README, dockerfile, index.ts, routers, trpc.ts, shared schemas), and server changes must be deployed to the Pi before the desktop uses them. Then T18 settings page. M7: T20 research pass (SM-2 / FSRS, Aimchess) can start any time. T23 builder polish is UI-only.
- **Gotchas:** as before; plus the Write tool strips trailing spaces from edit patterns; React Flow controls are default-styled.
- **Commands to run:** `./ctx.sh sync` · `cd apps/desktop && npm test`

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
