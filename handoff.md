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

## 2026-11-24 18:45 · A1 lead: 2.0 under way, usage limit hit
- **Done:** lanes D44 (A2 Features, A3 UI, A4 Security). Merged to `main@981958d`: T30 pt1, T31 tests, csp-leftover, T36 accessibility, tidy-after-a11y. Server `main@0c25879` = T29 (D43) + pentest fixes, **not deployed**. Research Passes 2–4. Moodboard: https://claude.ai/artifact/HWpo5fazbStkTH3xZjnGES.
- **Open branches:** `readme-rewrite@dc4d116` (A2 + A3 approved older shas; needs re-approval from all 3, merge only after the Pi deploy) · `weakpoints-open-in-board@e0db23f` (F1 groundwork, waits on Harry's a/b/c) · `reserved-ids-test` (A4, uncommitted tests, waits on 🟠 9).
- **Waiting on Harry:** Pi deploy · F1 a/b/c · F2 Stockfish · F3 Google (table) · T40 deletion + backups question · port 3001 binding (A4 rec A) · 🟠 1–9 · moodboard OK · check the local server `.env` (see the incident below).
- **Next step:** log Harry's picks in decisions.md and route them: F1, 2, 3, 7, 9 → A2; 1, 4, 6, T40, F3, port → A4; moodboard → A3 (T37, token map ready). After the deploy: merge readme, A4 bumps the submodule pointer 0267f60 → 0c25879.
- **Gotchas:** junction incident (below). Approvals name a sha. A2 relays Harry's answers from its own session.
- **Commands:** `./ctx.sh sync` · `cd apps/desktop && npm test` · ListAgents (A2 chessbox-80, A3 chessbox-65, A4 chessbox-36).

## 2026-11-24 18:20 · Incident: main checkout's node_modules + server source deleted (fixed)
- **What:** A3's `accessibility-pass` worktree had `node_modules` junctioned to the main checkout's (desktop + server). `git worktree remove --force` followed them: main's desktop and server `node_modules` emptied, and through npm's workspace junctions 40 tracked server files (`apps/api`, `packages/shared`) were deleted.
- **Fixed:** `git checkout -- .` in `vendor/chessbox-server` (deletions only), `npm ci` in both. Desktop 211 + 2 expected fail, type-check clean, server 24 at `0267f60`.
- **Not checkable by Claude:** the untracked local `vendor/chessbox-server/apps/api/.env` was inside a deleted folder. Harry must check and restore it himself if he uses a local server. The Pi is untouched.
- **Rule added:** TEAM.md rule 1 (no linked `node_modules`; check for links before removing a worktree).

## 2026-11-21 00:40 · M7 merged: WeakPoints + Novelty Finder polish on main
- **Done:** `weakpoints-drills` merged to `main@cf9f9ee` (pushed, branch deleted). T21 + T24–T28 ticked. D21, D30, D32, D38 Verified in the app; the rest Built. 209 tests.
- **In progress:** nothing; no open branches.
- **Next step:** open the Novelty Finder on the White Aggressive Italian and let the 147 deviation checks finish (~15 min, estimate); time it for D38's evidence. Then ▶ Now is empty for stage 1: offer the Parked list.
- **Gotchas:** Harry's rule: on a conflict his earlier decision wins. Random drills live in `src/weakpoints/lines.ts` (no ts-fsrs in the renderer).
- **Commands to run:** `./ctx.sh sync` · `cd apps/desktop && npm test` · `npm start`

## 2026-11-21 00:10 · WeakPoints modes, branch filter, auto verdicts, board ↔ graph
- **Done:** on `weakpoints-drills` (`db9be75`, pushed): Harry's feedback (layout, Home badge, auto-advance, explicit repertoire pick) + D36–D41 built: Focused / Mistakes only / Random, opening branch filter, early deviations skipped, automatic deviation verdicts (Evaluate button gone), game dates + times, Graph buttons, builder ↔ board at the selected node. 209 tests green.
- **In progress:** not merged; Harry to try it in the dev app.
- **Next step:** Harry checks WeakPoints (all 3 modes, an opening filter), Novelty Finder (background check progress, game lists, Graph), board "Show in graph". Then merge, tick T21 + T24–T28, measure D38's first pass on the Italian.
- **Gotchas:** novelties no longer get new verdicts (D38 is deviations only). Random lives in `src/weakpoints/lines.ts` (no ts-fsrs in the renderer). Rule: on a conflict Harry's earlier decision wins.
- **Commands to run:** `./ctx.sh sync` · `cd apps/desktop && npm test` · `npm start`

## 2026-11-20 21:45 · T21 WeakPoints built on a branch
- **Done:** D30–D35 decided (Harry took all recs) and built on `weakpoints-drills` (`2b805d7`, pushed): `src/weakpoints/cards.ts` (pool, lead-in, FSRS), `src/Storage/WeakPoints.ts` (file + IPC), `pages/WeakPoints.tsx`, verdict gains `playedCp` / `preparedCp` + a Re-check button. 196 tests green.
- **In progress:** not merged. Needs Harry to run a drill session in the dev app.
- **Next step:** Harry: Toolkit → WeakPoints → Start, play a few drills (get one wrong on purpose). Then merge, tick T21, set D21–D35 Verified.
- **Gotchas:** Harry: on a conflict the earlier decision wins (D32 amended to send `played`; D35 backup name; dismissed deviations keep their card). Old verdicts need Re-check to be filtered by the 0.3 rule.
- **Commands to run:** `./ctx.sh sync` · `cd apps/desktop && npm test` · `npm start`

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
