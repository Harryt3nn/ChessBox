# ChessBox: tasks

Work **▶ Now** top to bottom. Tags: `[🟠 your call: …]` = a design decision for the builder (CLAUDE.md §1) · `[⏸ waits on: …]` = blocked.

## 📊 Latest (the only home of volatile facts)
- **Updated:** 2026-11-19 00:30
- **`main` at:** bb66569 (pushed) · **open branches:** none · **Electron:** 42.11.18
- **Tests:** 159 passing (19 files) · **Builder:** 888-node Italian renders in ~1.2 s · **Verdict:** full Stockfish (single-threaded) depth 18 in ~4 s per finding · **Novelty run:** "Check all games" on White Aggressive Italian = 4,396 games in 22 s in the dev app (2,627 deviations, 1,757 novelties, 12 in prep) · **Walk alone:** ~3 ms / game · **npm audit:** 47, build / dev tooling only

## ▶ Now (ranked): stage-1 MVP from `system.md` (2026-11-18)
**M1 · Layout**
- [x] **T7 · Home hub replaces the sidebar** (UI: Claude's call) · Done when: no page renders the sidebar; Home shows a card per section (Analysis board, Repertoires, Toolkit, Analytics, Settings); every page has a top bar back to Home; the app builds and `npm test` is green.
- [x] **T8 · Toolkit page lists its tools** · Done when: Novelty Finder and WeakPoints open from the Toolkit (Novelty Finder is a toolkit tool, D15).

**M2 · Analysis board**
- [x] **T9 · Captured-pieces graveyard** · Done when: a pure captured-pieces helper is tested for normal captures, promotions, en passant and custom-FEN starts, and is shown beside the board with the material difference.
- [x] **T10 · Borderline / invalid input tests** · Done when: tests cover a bad FEN (wrong ranks, missing king, side not to move in check), a PGN with an illegal move, an empty PGN, an oversized PGN, a multi-game PGN, promotion with check, castling through check; all pass (anything failing is fixed test-first).
- [x] **T11 · Engine service (D14)** · Done when: a Stockfish Web Worker wrapper speaks UCI (`isready`, `position`, `go depth/movetime`, `stop`), is tested with a fake worker, and runs lite on the board.
- [x] **T12 · Eval bar + engine lines** · Done when: the board shows an eval bar (cp / mate, from White's side), the best line(s) and an engine toggle; changing position stops the old search.

**M3 · Repertoire ↔ board**
- [x] **T13 · Open a repertoire in the analysis board** · Done when: a pure graph → tree conversion (transpositions shown, no infinite loops) is tested, and "Open in board" works from Repertoires (read-only).
- [x] **T14 · Edit a repertoire from the board** · Done when: moves added on the board can be saved back as nodes, respecting the single-response rule (D17).

**M4 · Novelty finder (toolkit tool)**
- [x] **T4 · Single-response constraint (D17)** · Done when: the editor blocks a second reply on your move, and an import flags violating nodes for you to resolve.
- [x] **T3 · The walk** · Done when: tests show a game walked against the chosen repertoire (D15) returns its matches, the first deviation (`prep-miss`) or novelty (`opponent-gap` / past a leaf), and follows transpositions.
- [x] **T15 · Single + bulk runs, results saved locally (D16)** · Done when: picking a repertoire and one game or all imported games writes results under `ChessBox-data/novelty/` (format shown to Harry first: a 🟠 schema decision).
- [x] **T16 · Stockfish verdict + add to repertoire + open in board** · Done when: each novelty / deviation gets a full-engine eval and can be added as a node or opened in the analysis board.

- [x] **T22 · Account picker (D19)** · Done when: the run only reads games from ticked `<site>/<username>` folders, tested; the choice is saved per repertoire.

**M5 · Repertoire builder**
- [x] **T17 · Visual graph builder (chessgraph style), CRUD, folders** (React Flow + dagre, D20) · Done when: create / rename / delete repertoires and nodes visually, saved to disk.

**M6 · Profile and settings**
- [ ] **T23 · Builder polish (UI)** · Done when: React Flow controls match the theme; collapse/expand branches for big repertoires; promotion picker on the mini board (it always queens now).
- [ ] **T18 · One settings page replaces the profile cards** (UI: Claude's call) · Note: today's Settings hangs on "Loading profile…" when the Pi is unreachable. · Done when: profile info, linked accounts, change password and change username live on one page; forms have correct `autocomplete` attributes.
- [ ] **T19 · Server: change password / username + rate-limit login and register (was T5)** · Done when: tested on the server, deployed to the Pi first, then the desktop switched over.

**M7 · WeakPoints trainer (toolkit tool)**
- [ ] **T20 · Research pass: spaced repetition (Anki SM-2 / FSRS) + Aimchess** · Done when: `research.md` Pass 1 is graded and a recommendation is ready for Harry.
- [ ] **T21 · WeakPoints drills** · Done when: short move sequences from saved deviations, rarely hit nodes and strong nodes are drilled on a blank board, scheduled by the chosen algorithm.

**Loose ends**
- [x] **T6 · Check B8 in the app** (Escape in "New Folder" may still create one).

## 🅿️ Parked (ideas, not agreed work; offered when ▶ Now is empty)
*Stage 2, from `system.md`:* repertoires on a server (maybe MongoDB, user details stay in Postgres) · email verification · MFA · Google sign-in / sign-up · AI move explanations (theory presets + interpreting Stockfish, no paid API keys) · AI "add suggestions" for repertoires · a private chess-theory knowledge base · multi-reply "acceptable alternatives" so a reasonable non-prep move isn't penalised (D17) · more toolkit tools.
*From the 2026-11-18 bug sweep (not bugs that need fixing now):*
- The `locked` class on the app layout never applied (it lives in a CSS module, so its name is hashed); the login overlay covers the page anyway.
- Lichess requests have no timeout (Chess.com uses 30 s); a total timeout would cut long game streams, so it needs an idle timeout.
- An import always brings in every node, even for repertoires you didn't select, so orphan nodes pile up in `nodes.json`.
- The server URL is hard-coded in `trpc.ts` (tailnet IP).
- Component tests (jsdom + Testing Library) for UI bugs like B8.
*Migrated from `documentation/TODO.md` and `CHESSBOX_MASTER.md` §5 on 2026-11-18.*
- Analytics page: Lichess / Chess.com stats, opening success vs. repertoires, per-platform + combined views, time filters (latest / today / week / all time).
- Novelty analyser: evaluate novelties with Stockfish (maybe AI feedback), then add one to a repertoire. Each repertoire gets an "original" view and a "with novelties" view.
- Stockfish on the analysis board; board extras (toggle legal-move highlights, highlight legal captures, board cosmetics).
- Repertoire export in the chessgraph format.
- A visual black / white indicator on EditRepertoires.
- Native graph creation (deferred: Harry wants a more original approach than a chessgraph clone).
- Training tools page.
- Presaved / shared repertoires, maybe a community platform (needs password reset + email verification first).
- Email verification, password reset, change password, sign out everywhere (D9: rebuild with the server deployed first).
- Tighten the CSP before packaging: drop `unsafe-eval` and `ws://localhost:3000` (`index.html`, `forge.config.ts`); keep `'wasm-unsafe-eval'` so Stockfish still loads. Ship Stockfish's full GPL text (`node_modules/stockfish/Copying.txt`) with releases.
- Case-insensitive usernames (`Harry` and `harry` can both exist).
- Graceful "server unreachable" UI.
- Style `ImportModal.tsx` (it uses unstyled global class names).
- Integration tests on server `auth.ts`.
- Fix `docker-compose.yml` `Dockerfile` vs. tracked `dockerfile` case.
- Server `.gitignore`: `apps/api/src/generated/`, `packages/shared/dist/`.
- Security headers (helmet) on Fastify; a JWT refresh-token flow.
- Theme switching (cream / noir variables are scaffolded in `index.css`).
- Piece sounds, a final logo, coloured folders.
- Mobile companion app (training only, thin client, no AI).
- Infra: Pi SSD reliability (JMicron enclosure), two-node Pi 5 + Pi 2 load balancer, multi-stage Docker build (the image is ~2.4 GB), Redis rate-limit store if there's ever more than one API instance.

## ── Archived (superseded, do NOT action) ──

## ✅ Done log (newest first)
- 2026-11-19 02:30 · T17 visual builder (React Flow 12.12 + @dagrejs/dagre 3.1, D20): layout, mini board add (drag or click), comments, delete branch, new / delete repertoire; found + fixed: the start position lost its graph id in the board tree (adding from the start silently failed); verified in the app on real data, then restored from backup · `main@bb66569` · 11 tests
- 2026-11-19 01:30 · T22 account picker (D19): with lichess/theoneandonlylipika unticked, a full check covers 4,171 of Harry's own games instead of 4,396 · 3 tests
- 2026-11-19 01:00 · T16 finding actions: open in board at the position (save from there), full-Stockfish verdict (score after the move + engine best; 4.0 s at depth 18 in the app), dismiss/restore · `main@57efe74` · 6 tests
- 2026-11-19 00:30 · T15 novelty runs: pick a repertoire, check latest / all games, results in `novelty/<id>.json` (D18), deviation + novelty tables; verified on real data in the app · `main@fd04a4a` · 8 tests
- 2026-11-19 00:00 · T4 import gate for one reply on your move (D17): conflicts listed in a restyled import window, other branches dropped · `main@3f78ffd` · 5 tests (window not seen on screen: needs the native file picker)
- 2026-11-18 23:45 · T3 novelty walk (deviation / opponent-move / end-of-line, transpositions followed); smoke-run on 8,340 real games · `main@2b3f9de` · 10 tests
- 2026-11-18 23:15 · T14 save board moves back to the open repertoire (new nodes, transposition links, one-reply rule); verified on real data then restored from backup · `main@28aa6de` · 13 tests
- 2026-11-18 22:30 · T13 open a repertoire in the board (graph → tree, transpositions as leaf links, board flips to its side) · `main@415d324` · 9 tests
- 2026-11-18 21:30 · T11 + T12 Stockfish 18 lite in a Web Worker (UCI wrapper, tested with a fake worker), eval bar, 2 engine lines, toggle; engine files verified inside the packaged app · `main@cb7e11c` · 19 tests
- 2026-11-18 20:55 · T10 board edge-case tests; found + fixed: positions where the side not to move is in check were accepted · `main@ca0e9ae` · 21 tests
- 2026-11-18 20:40 · T9 captured-pieces graveyard + material lead, flips with the board · `main@20c5f61` · 10 tests
- 2026-11-18 20:20 · T7 + T8 home hub (top bar replaces the sidebar), Toolkit lists Novelty Finder + WeakPoints; screenshots checked in the running app · `main@99526de`
- 2026-11-18 20:20 · T6 closed: in the running app, Escape on "New Folder" saves nothing (B8 was not a bug). B4 toast and B5/B6 Uncategorised fix also confirmed in the app
- 2026-11-18 19:00 · Electron 42.11.2 → 42.11.18 (clears its high-severity advisory); tests, tsc, package build OK · `main@db26f39`
- 2026-11-18 18:40 · Deleted account (`NOT_FOUND`) also clears the saved session (D13) · `main@9506805` · 1 test
- 2026-11-18 18:10 · B4 Pi offline at startup no longer signs you out (D13) · `main@5dca4dd` · 5 tests
- 2026-11-18 18:00 · B3 Chess.com import skips variant games (`rules` ≠ `chess`) · `main@6c357a3` · 3 tests
- 2026-11-18 17:50 · B5/B6 Uncategorised folder: shown on first load, can't be deleted or renamed, never saved to disk · `main@6b35228` · 4 tests (UI wiring not clicked through in the app)
- 2026-11-18 17:40 · B7 board import: a PGN starting with a `{ comment }` was read as broken JSON · `main@cedcd59` · 8 board tests
- 2026-11-18 17:35 · B2 `pgnToJson` crashed on games with a FEN tag · `main@9fc2e16` · 3 tests
- 2026-11-18 17:30 · B1 sanitiser crash / bad links on prototype-key ids (`constructor`, `toString`, `__proto__`) · `main@d1c75a1` · 5 tests
- 2026-11-18 17:20 · T2 Vitest harness + 18 sanitiser tests for existing behaviour · `main@2d2aa3c`
- 2026-11-18 17:20 · T1 Cleanup: removed dead files (importANB, RepList, unused buttons, stale type stubs), removed unused deps (@electron/remote, dagre, reactflow, electron-squirrel-startup) and the old 928 MB root `node_modules`; declared react, react-dom, @trpc/server and forge shared-types; untracked `.vscode/settings.json` · `main@f7335b2` · tsc 0 errors, package build OK
- 2026-11-18 · Baseline: committed BoardView rework + auth revert WIP · `main@f317609`
