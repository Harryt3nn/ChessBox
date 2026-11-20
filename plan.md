# ChessBox: plan

A bare § means this file. `tasks.md` holds the ranked work; `decisions.md` holds the why. The detailed, public architecture reference stays in `documentation/ARCHITECTURE.md` on `main`.

## 0. NOW (read every session)
**Decisions in force** (one line each, pointing at `decisions.md`):
- D1: Repertoires are graphs: normal `childIDs` + explicit `transpositionEdges`.
- D2: Repertoire format stays chessgraph.net v3 compatible on import; the sanitiser normalises to `childIDs` in a `Record<id, Node>`.
- D3: Split storage: repertoires, nodes, games and the auth token on the local filesystem; accounts (and later derived analysis) in Postgres.
- D4: Game analysis runs client-side; the server is a thin auth + storage layer.
- D5: Two repos: desktop here, API + `@chessbox/shared` in the `chessbox-server` submodule.
- D6: The API is only reachable over Tailscale; Postgres is never published.
- D7: Passwords use Argon2id with a timing-safe login; sessions are JWTs encrypted at rest with `safeStorage`.
- D8: The renderer is sandboxed; main re-sanitises every IPC and import payload.
- D9: Email verification, password reset and sign-out-everywhere were reverted on 2026-10-05 (Dropped for now).
- D10: Dead code and unused deps were removed on 2026-11-18; deps the code uses are declared.
- D11 (Planned): Novelty finder = layered derived data + a deterministic ply-by-ply walk.
- D12: Tests run on Vitest (`npm test`); bugs are fixed test-first.
- D14: Stockfish = WASM in a Web Worker: lite build for the live board, full multi-threaded build for deep novelty checks.
- D15: The user picks the repertoire before every novelty-finder run; Novelty Finder and WeakPoints are Toolkit tools.
- D16: Novelty-finder results are stored locally under `%APPDATA%/ChessBox/ChessBox-data/novelty/`.
- D17: Exactly one prepared reply per position on the user's move (D11's single-response constraint); multi-reply alternatives are stage 2.
- D18: Novelty results = one JSON per repertoire in `novelty/` (games → derived findings + node hits).
- D19: The novelty finder only uses the imported accounts you tick (remembered per repertoire).
- D20: Repertoire builder = React Flow + dagre.
- D21: WeakPoints = FSRS (ts-fsrs 5.4.2), card = your prepared reply drilled as a short sequence.
- D22: WeakPoints schedules in `weakpoints/<repertoireId>.json`.
- D23: Deviations within 0.3 pawns (TUNE) of the prepared move aren't drilled.
- D24: Login tokens (JWT) last 3 days.
- D25: Server hardening: CORS allow-list, rate limits, safe `user.me`, Postgres not published.
- D26: Login 10 fails / 15 min per IP + username (reset on success); register 5 / hour per IP (TUNE).
- D27: A password change doesn't sign out other devices **for now** (revisit: see Pending).
- D28: Change password / username both re-ask the current password; contract in `decisions.md`.
- D29: Server tests run on Vitest too (`npm test` in `vendor/chessbox-server/apps/api`).
- D30: `weakpoints/<id>.json` = `{version, cards: {nodeId: {source, fsrs, log}}}`, full review log kept.
- D31: Verdicts store `playedCp` / `preparedCp` from your side (mate = ±100 pawns); old ones count as no verdict.
- D32: WeakPoints scheduling runs in main; IPC = `weakpoints:queue` + `weakpoints:grade(nodeId, correct)`.
- D33: Cards = deviations (non-dismissed, outside 0.3) + rare (hit 1–2) + strong (hit ≥ 5, never deviated); 10 new / day (TUNE).
- D34: A drill starts 2 of your moves back (TUNE); only the target move is graded.
- D35: Unreadable weakpoints file → backed up, fresh start, toast; deleted node → card dropped; changed reply → card reset.
- D13: A saved session is cleared only when the server answers `UNAUTHORIZED` or `NOT_FOUND` (deleted account); unreachable / erroring server → stay signed in, toast, local features keep working.

**Pending / Unconfirmed** (*not decided*; each with the condition that decides it):
- **Revisit D27 (sign other devices out on password change):** chose A only *for now*. *Decide before the API leaves Tailscale or before stage 2, whichever comes first. Leading candidate: `passwordChangedAt` column checked in `createContext`.*
- Deadline: none stated in `system.md`. *Decide if a date matters.*

**Active gates** (date · what must work · what we fall back to if it doesn't):
- {{none yet: set from Harry's feature md}}

## 1. Summary
ChessBox is a free, all-in-one chess training desktop app, built by Harry for his own training and as a learning project. Opening repertoires are modelled as graphs, not trees, so transpositions are one node reached by several paths. A novelty finder walks your imported Lichess / Chess.com games against those graphs to show where you (or your opponents) left prep. Stage-1 MVP (`system.md`): a home hub, a Lichess-style analysis board with Stockfish, repertoires you can open and build visually, the novelty finder, one settings page, and the WeakPoints trainer. First up: the layout, then the analysis board.

## 2. Goals, non-goals, success metrics
- **Goals:** one free place for the chess training tools Harry actually wants, built on his own game data. Learn the full stack in depth (frontend, backend, infrastructure, deployment) and have fun.
- **Non-goals:** the next big chess app or a startup. No team-scale infrastructure (Vault, Turborepo, Sentry, CI/CD migration pipelines, Redis) unless a real need shows up.
- **Done when (stage-1 MVP):** every ▶ Now task for M1–M7 in `tasks.md` is done: home hub, analysis board with Stockfish + eval bar + graveyard, repertoires openable in the board, novelty finder (single + bulk) with engine verdicts, a visual repertoire builder, one settings page with password / username changes and login rate limits, and the WeakPoints trainer.

## 3. Users and main flow
The user is Harry (a single user for now; accounts exist on the server).
1. Sign in (the LogIn overlay) and link Lichess / Chess.com usernames in Settings.
2. Import repertoires from a chessgraph.net JSON export (EditRepertoires).
3. Import your games from Lichess / Chess.com (NoveltyFinder).
4. *(planned)* The novelty finder walks each game against your same-side repertoires and records deviations.
5. *(planned)* Review deviations: dismiss them, or add them as new nodes, with a Stockfish eval attached.
6. *(planned)* Analytics: opening success rates vs. repertoires, per platform and combined, filtered by time period.
- Analysis board (BoardView): play or analyse moves, import and export PGN / FEN.

## 4. Requirements
| ID | Requirement | Status |
|---|---|---|
| R1 | Repertoire browser: folders, repertoires, rename, Uncategorised folder | Built |
| R2 | chessgraph.net JSON import with sanitiser + selection modal | Built |
| R3 | Lichess + Chess.com game import (blitz + rapid) as `.pgn` | Built |
| R4 | Auth: sign up, sign in, session restore; JWT in `safeStorage` | Built |
| R5 | Settings: profile card, permanent Lichess / Chess.com links | Built |
| R6 | Analysis board: move tree with variations, PGN/FEN import + export, promotion, highlights, keys | Built |
| R7 | Designed shells for Home, Analytics, NoveltyFinder, TrainingToolkit (no logic behind them yet) | Built |
| R8 | Test harness with `npm test`, starting with the import sanitiser | Built |
| R9 | Novelty-finder walk: deepest match + first deviation per game | Planned |
| R10 | Single-response constraint: an editor block + an import-time resolution gate | Planned |
| R11 | Server: login / register rate limits; deploy the pending server update to the Pi | Planned |
| R12 | Analytics page over linked accounts | Planned |
| R13 | Stockfish on the board and for novelty evaluation | Planned |
| R14 | Repertoire export (chessgraph format) | Planned |

## 5. Architecture
```
Electron desktop (Windows)                          Raspberry Pi 5 (Docker Compose)
 Renderer (React, sandboxed)                         api: Fastify + tRPC ──► postgres
   │ window.storage / window.api                       ▲  (not published)
 preload.ts (contextBridge)                            │ HTTP :3001 inside Tailscale (WireGuard)
   │ ipcRenderer.invoke                                │
 Main (Node): MainStorage, importers ── fs            │
 Renderer ── tRPC client (src/trpc.ts) ────────────────┘
```
- **Renderer:** pages in `src/pages`, components in `src/components`. Navigation is one `useState<Page>` in `App.tsx`, with no router. It reaches storage via `StorageProvider` → `FileSystemStorageProvider` → `window.storage.*`.
- **Main:** `src/index.ts` registers the IPC handlers, `MainStorage.ts` does the disk I/O, and `LichessImporter` / `ChesscomImporter` / `PGNtoJSON` handle games. `sanitiseImport.ts` is pure TS, shared by both sides.
- **Board:** `BoardView.tsx` + `chess/analysisTree.ts` (pure tree, PGN/FEN) + `components/board/MoveList.tsx`.
- **Server:** in `vendor/chessbox-server`. The desktop imports `@chessbox/shared` (zod schemas + the `AppRouter` type) through tsconfig paths, webpack aliases and ForkTsChecker's `configFile`.

### 5.1 Contracts (what a caller can rely on; changing one is a 🟠 decision)
```
Disk: %APPDATA%/ChessBox/ChessBox-data/
  folders.json            { folders: Folder[] }
  nodes.json              Record<nodeId, Node>  (all repertoires)
  repertoires/{id}.json   Repertoire { id, name, side, rootNodeId, folderId|null, createdAt, updatedAt }
  auth.token              JWT, safeStorage-encrypted
  games/{lichess|chesscom}/{username}/{gameId}.pgn
  unparseable JSON → renamed <name>.corrupt-<timestamp>
Node { id, repertoireId, move, fen, comment, color, tags, parentId, childIDs[],
       transpositionEdges[{targetId, move}], arrows[], highlightedSquares[] }
Ids that become file names: [A-Za-z0-9_-]{1,64}
IPC: storage:{loadFolders, saveFolders, loadRepertoires, saveRepertoire, openFileDialog,
     readFile (dialog-picked only, ≤20 MB), importRepertoires, save/load/clearAuthToken},
     import-lichess, import-chesscom
tRPC: auth.{register, login, me} · connections.{connectLichess, connectChesscom} · user.me
Import limits (IMPORT_LIMITS): 20 MB, 250k positions, 5k repertoires, 1k folders; game PGN ≤200 KB
```
Full tables: `documentation/ARCHITECTURE.md`.

## 6. Failure modes and fallbacks
| Failure | Detection | Fallback |
|---|---|---|
| Corrupt JSON on disk | parse error | rename to `.corrupt-<ts>` and carry on without it |
| Bad repertoire import | sanitiser | drop or repair the bad parts and show warnings; `ImportError` if nothing is usable |
| Bad game in an import | per-game check | skip that game, keep importing |
| Pi server unreachable at startup | `restoreAuthToken` → `unverified` (fetch fails or non-`UNAUTHORIZED` error) | keep the token, keep the app unlocked, show a toast (D13) |
| Desktop and server versions out of step | sign-in breaks | deploy the server first (D9 lesson) |

## 7. Milestones
Stage-1 MVP (from `system.md`), in build order, each gated by its tasks' "Done when" in `tasks.md`:
M1 Layout → M2 Analysis board → M3 Repertoire ↔ board → M4 Novelty finder → M5 Repertoire builder → M6 Profile and settings → M7 WeakPoints. Then stage 2 (Parked).

## 8. Open questions
- What 1.0 means and when (Harry's md).
- JWT expiry: 3 or 7 days?
- `docker-compose.yml` references `apps/api/Dockerfile`, but the tracked file is `apps/api/dockerfile` (Linux paths are case-sensitive).
- Does `.gitignore` in the server repo cover `apps/api/src/generated/` and `packages/shared/dist/`?

## 9. References
- `documentation/ARCHITECTURE.md`: the detailed architecture.
- `documentation/README.md`: setup + Troubleshooting (the Electron hoisting workaround).
- chessgraph.net: inspiration and the import format.
