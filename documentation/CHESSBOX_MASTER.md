# ChessBox — Master Project Document

*Living reference document: interview talking points, architecture, current state, and roadmap. Last updated 10 September 2026.*

---

## 1. What ChessBox Is (30-second version)

ChessBox is a free, self-hosted chess training platform that consolidates tools usually scattered across paywalled competitors into one environment. The headline technical idea: **opening repertoires are modelled as graphs, not trees**, so transpositions (reaching the same position via different move orders) are represented correctly instead of duplicated. On top of that sits a **novelty finder** — imported games from Lichess/Chess.com are walked against the user's repertoire graphs to surface exactly where and how often they deviate from prepared lines, turning raw game history into targeted training data.

It's a solo project, built and deployed end-to-end: Electron desktop client, a self-hosted Fastify/tRPC/PostgreSQL backend running on a home Raspberry Pi, reachable remotely over Tailscale.

---

## 2. Interview Talking Points

Pick from these depending on what the conversation's actually about — don't recite all of them.

### If asked about a technically interesting design decision
- **Graph vs. tree modelling for repertoires.** Trees force duplicate nodes for every transposition; representing the repertoire as a graph (explicit `transpositionEdges` alongside normal `childIds`) collapses these into one canonical node, reached via multiple paths. Directly inspired by, and compatible with, an existing open-source tool (chessgraph.net) but extended with the analysis layer that tool lacked.
- **The novelty-finder walk is a deterministic tree traversal, not a search.** Because a repertoire only ever specifies *one* intended response for the user's own moves (opponent branches are the only place multiple children are legitimate), matching a game against a repertoire doesn't require fuzzy "best fit" logic — it's a straightforward ply-by-ply walk that stops at the first divergence. This constraint is enforced both at creation time (UI blocks adding a second user-move child) and at import time (a resolution gate for repertoires imported from tools without this constraint, like chessgraph.net).
- **Client-side processing as a deliberate trade-off, not a limitation.** Game analysis (the graph walk, deviation detection) happens entirely on the user's own machine, not the backend. This was a conscious call given the backend runs on a single Raspberry Pi: server-side processing would make the Pi the bottleneck for *every* user's analysis; client-side means the backend stays a thin, stateless auth+storage layer that doesn't scale with how much analysis any individual user does. Good example of infrastructure constraints shaping architecture *well*, not just being worked around.

### If asked about debugging / production-style problems solved
All genuinely happened, in order of how good a story they make:
- **Silent filesystem corruption on a self-hosted SSD**, caught not by an obvious crash but by a Postgres `FATAL` on a core catalog file. Diagnosed by checking `dmesg`/`journalctl` for a disconnect event (found none — this was silent corruption, not a dropout), confirmed via host-level file read attempts outside Docker entirely, and resolved by falling back to a proven-reliable storage path rather than continuing to fight unreliable consumer hardware under time pressure — a real "know when to cut a flaky dependency" call.
- **A corrupted disk clone caught by verification, not assumption.** After cloning an SD card to an SSD for a boot migration, byte-for-byte identical file sizes and timestamps hid a genuine checksum mismatch — only caught by explicitly running `md5sum` before trusting the clone, rather than assuming success from a clean exit code.
- **A USB chipset (JMicron JMS583) with known UAS-protocol instability on Raspberry Pi**, diagnosed from kernel logs (`dmesg`) down to the exact vendor:product ID, fixed with a `usb-storage.quirks` kernel parameter forcing fallback to plain USB Mass Storage mode.
- **Monorepo split into two independent repositories**, with the tricky part being that a `tRPC`-based client needs the server's `AppRouter` *type* for end-to-end type inference — solved via a git submodule plus manually wiring the same module-resolution fix across three separate tools that all needed to independently agree on it: TypeScript's `tsconfig.json` paths, webpack's `resolve.alias` (in both main and renderer configs), and `ForkTsCheckerWebpackPlugin`'s `configFile` option.
- **A config-drift bug where a local, uncommitted fix (pointing Postgres at the SSD) got silently reverted by a `git pull`**, because the fix had only ever been made directly on the Pi, never pushed. Root-caused by comparing `docker-compose.yml` on both machines side by side rather than assuming either one was current.

### If asked about security
- Passwords hashed with **Argon2id** (via `hash-wasm`), not a weaker legacy hash.
- **Timing-safe login**: a fixed dummy hash is compared against even when the username doesn't exist, so response time doesn't leak whether an account exists (defends against username enumeration).
- JWT-based auth, currently a flat expiry (see Roadmap — refresh-token flow is a known future improvement, not yet built).
- Known gap, openly acknowledged: **rate limiting is not yet implemented** on `auth.login`/`auth.register` — flagged as the single highest-priority pre-v1 security item (see §7). Good, honest answer if asked "what would you do next" — shows awareness of what's actually missing rather than claiming completeness.

### If asked about AI use in the project
Straightforward, non-defensive answer: AI was used as an accelerant for scaffolding in areas involving frameworks used for the first time (much of the initial stack was genuinely new to me), specifically to move faster past boilerplate rather than to avoid learning it. The proof this didn't become a crutch is demonstrable, not just claimed — the entire deployment, debugging, and infrastructure work (everything in the section above) was done independently, reasoning through unfamiliar systems (Docker internals, npm workspaces, kernel-level USB behaviour, Prisma's config resolution) without being able to lean on AI-generated scaffolding, because none of it existed yet for these specific, novel problems.

---

## 3. Architecture

### 3.1 System overview

```
┌─────────────────────────┐         ┌──────────────────────────────────────┐
│   Electron Desktop App  │         │         Raspberry Pi (home server)   │
│   (Windows, packaged)   │         │                                      │
│                         │  HTTPS  │  ┌──────────────┐   ┌──────────────┐ │
│  Renderer (React) ◄──── ┼Tailscale┤  │  api         │   │  postgres    │ │
│    ↓ IPC bridge         │  :3001  │  │  Fastify+tRPC│──►│  (Docker)    │ │
│  Main (Node, filesystem)│         │  │  (Docker)    │   │              │ │
└─────────────────────────┘         │  └──────────────┘   └──────────────┘ │
                                    └──────────────────────────────────────┘
```

- **Desktop app**: Electron + React + TypeScript, Electron Forge (webpack-typescript template). Fully offline-capable for repertoire/game data (stored locally); connects to the remote API only for auth and (future) derived analysis data.
- **Backend**: Fastify + tRPC + Prisma/PostgreSQL, containerised via Docker Compose, self-hosted on a Raspberry Pi 5, reachable remotely via **Tailscale** (no public port-forwarding — the API is only reachable to devices on the user's own tailnet).
- **Two separate git repositories** (`ChessBox` — desktop client; `ChessBox-Server` — API + shared types), linked via a git submodule so the client retains full tRPC type inference against the server's router without needing them in one repo.

### 3.2 Desktop app: process model

Electron's two-process split, both real:

- **Main process** (`src/index.ts`, `src/preload.ts`) — Node.js context, full filesystem/OS access. Registers all `ipcMain.handle` handlers, does the actual file I/O via `MainStorage.ts`, native file dialogs.
- **Renderer process** (everything under `src/pages`, `src/components`) — sandboxed, no direct Node access. Talks to main exclusively via `window.storage.*`, bridged through `preload.ts`'s `contextBridge`.

```
Renderer (React component)
    ↓ calls
window.storage.loadFolders()
    ↓ defined in preload.ts (contextBridge)
    ↓ sends
ipcRenderer.invoke("storage:loadFolders")
    ↓ handled by
ipcMain.handle("storage:loadFolders")  in main process
    ↓ reads disk via
MainStorage.ts / fs.promises
```

A `StorageProvider` interface sits between renderer components and the IPC bridge (`FileSystemStorageProvider` is the current, only implementation) — deliberately structured so a mock/in-memory implementation could be swapped in for testing without touching the real filesystem.

### 3.3 Data storage — the client/server split

Two genuinely different storage systems for two genuinely different kinds of data:

| | Where | What | Why there |
|---|---|---|---|
| **Filesystem** (local, per-device, via `MainStorage.ts`) | `%APPDATA%/<app>/ChessBox-data/` | Repertoires, nodes, imported games (Lichess/Chess.com), auth token (OS-encrypted via `safeStorage`) | Large, per-user, edit-heavy, source-of-truth data with no need for relational querying |
| **PostgreSQL** (remote, via the Pi's API) | `chessbox` DB | User accounts; *(planned)* deviation/match records from novelty analysis | Statistical/aggregate-shaped derived data — "how many times has this deviation occurred," "list all unresolved deviations" are relational queries, not filesystem scans |

Local filesystem layout (`documentation/ARCHITECTURE.md`, current):
```
ChessBox-data/
├── folders.json           # Array of all Folder objects
├── nodes.json              # Map of nodeId → Node (all nodes, all repertoires)
├── repositories/           # One .json file per repertoire
│   └── {repertoire-id}.json
├── auth.token               # OS-encrypted JWT
└── games/
    ├── lichess/
    └── chesscom/
```

### 3.4 Repertoire graph data model

```json
{
  "id": "uuid",
  "repertoireId": "uuid",
  "move": "e4",
  "fen": "...",
  "parentId": "uuid | null",
  "childIds": ["uuid", ...],
  "transpositionEdges": [{ "targetId": "uuid", "move": "Nxd4" }],
  "comment": "", "color": "#...", "tags": [], "arrows": [], "highlightedSquares": []
}
```

- `childIds` — moves originated at this node (normal tree structure).
- `transpositionEdges` — named edges to an **existing** node elsewhere in the graph, reached via a different move order. This is what actually solves the transposition problem — not "two nodes pointing to the same target," but an explicit, separate edge type layered on top of the tree.
- **Single-response constraint** (in progress, see Roadmap): whose move is next at any node is derivable from the node's FEN side-to-move vs. `repertoire.side`. If it's the user's move next, `childIds` must contain at most one entry — enforced at creation time (hard block in the editor) and at import time (resolution gate for graphs like chessgraph.net exports, which don't have this constraint natively).
- Format is **chessgraph.net (v3) compatible** by design — ChessBox can currently be thought of as a chessgraph extension for import purposes, until a native graph builder replaces manual/imported-only creation (see Roadmap #7).

### 3.5 Novelty finder — planned architecture (designed, not yet built)

**Layered data model**, each layer with clear ownership:
1. **Games** (filesystem, immutable, source of truth)
2. **Repertoires + Nodes** (filesystem, user-authored, source of truth)
3. **Match records** (Postgres, derived) — one row per game × repertoire actually walked: which repertoire, how deep, where it deviated
4. **Deviation catalog** (Postgres, derived, aggregated) — one row per unique `(repertoireId, nodeId, move, sourceType)`, with a `count` that increments on recurrence rather than duplicating rows

Layers 3–4 are **fully derivable from 1–2** — reprocessing (new repertoire, edited repertoire, new games) is always a safe, well-defined "wipe and re-walk" operation, never risks data loss on the source layers.

**The walk algorithm** (per game, per matching-side repertoire):
- Start at the graph root, ply 0.
- At each user-move ply: exactly one intended edge exists (enforced by the single-response constraint). Game's move matches → advance. Doesn't match → **deviation** (`sourceType: prep-miss`), stop walking this game against this repertoire.
- At each opponent-move ply: check both `childIds` and `transpositionEdges` for a matching move. Matches something → advance (transposition-aware, for free, since it's already in the data format). Matches nothing → **deviation** (`sourceType: opponent-gap`), stop.
- Game exhausts without ever deviating → clean run, nothing recorded (this is the "correct moves, disregard" case).
- Across all of a user's same-side repertoires, whichever walk went deepest is the best-fit match; below a minimum-depth threshold, the game is discarded for this purpose (too short to meaningfully belong to any prepared line).

**Review workflow**: each deviation has a `status` (`new` → `dismissed`/`added`), letting the user browse the catalog and decide whether to promote a recurring deviation into an actual repertoire node — with Stockfish evaluation (planned) attached as enrichment on the same record, not a separate pipeline.

**Processing happens entirely client-side** (Electron main process, where the filesystem data lives) — the backend only ever receives and stores the aggregated output, never raw games or graphs. See §2 for why this is a deliberate infrastructure-driven design choice.

---

## 4. Current Feature State (as of last commit)

Built and present in the codebase:
- Repertoire graph editor (create/browse/edit via `EditRepertoires`, `RepertoireCard`, `FolderSelection`)
- Board view with `react-chessboard` (`BoardView.tsx`) — basic analysis board, no Stockfish integration yet
- Import pipeline from chessgraph.net JSON exports (`validateChessGraphExport.ts` → `prepareForImport.ts` → `ImportModal.tsx` → merge into storage)
- Lichess and Chess.com game importers (`LichessImporter.ts`, `ChesscomImporter.ts`, `PGNtoJSON.ts`)
- Auth: sign-up/login/session restore, JWT stored via Electron's `safeStorage` (OS-level encryption)
- Stub/placeholder pages: `Analytics`, `TrainingToolkit`, `NoveltyFinder`, `Profile`, `Settings` — present in navigation, not yet functionally complete
- Full backend: Fastify + tRPC + Prisma, containerised, deployed, migrations applied, remotely reachable — genuinely live, not just locally runnable

---

## 5. Roadmap

### Before a "real" v1 launch (security/correctness, not optional)
- [ ] **Rate limit `auth.login`** — highest priority open item. No brute-force protection currently exists.
- [ ] **Rate limit `auth.register`** — prevent scripted account spam.
- [ ] **Rate limit `connections.connectLichess`/`connectChesscom`** — unbounded calls risk the server's IP getting blocked by those APIs.
- [ ] **Tighten CSP** before packaging — drop `unsafe-eval` and the dev-only `ws://localhost:3000` entry (both already flagged with TODOs in the code itself).
- [ ] **Lock down CORS** — currently reflects any origin (fine for dev, not for shipping).
- [ ] **Password reset flow** — no recovery path currently exists for a forgotten password.
- [ ] Finish or remove `importANB.tsx` — currently an incomplete partial copy of `ImportModal.tsx`.
- [ ] Real homepage content (currently a placeholder).
- [ ] Minimum-viable Profile page content (currently just a logout button).
- [ ] Fix `.moveActive` auto-scroll selector bug in `BoardView.tsx` (CSS Modules class won't match a plain `querySelector`).

### Core feature work
- [ ] **Novelty finder** — build out the designed architecture in §3.5. Highest-priority *feature* item.
- [ ] **Single-response enforcement** — creation-time hard block + import-time resolution gate (designed, see §3.4).
- [ ] Analytics page — Lichess/Chess.com connected-account stats, opening success rates compared against saved repertoires; per-platform and combined views; time-period filtering (today/weekly/all-time).
- [ ] Persistent Lichess/Chess.com account connections in Settings (avoid re-entering username every time).
- [ ] Stockfish integration — engine analysis on the board view, and evaluation feedback on novelties once the finder's built.
- [ ] Native graph creation/editing (currently import-only or manual piece-by-piece) — deliberately deferred pending a "more unique way of doing this" than a chessgraph.net clone.
- [ ] Export feature matching chessgraph.net's format (repertoire portability out, not just in).

### Expansion ideas (post-v1)
- [ ] **Mobile companion app** — training-tools only, *not* a full graph editor. Scope: review/train against deviations and novelties surfaced by the desktop app's analysis, likely a thin client against the same backend. Natural fit given the client/server split already treats the backend as a thin auth+storage layer rather than something desktop-specific. This will be a no AI project. 
- [ ] Theme switching (cream/noir — CSS variables already scaffolded, not wired to a UI toggle).
- [ ] Shared/presaved repertoire library — potential community platform if ChessBox ever goes further online-first (would need proper account infra beyond current scope: password reset, email verification, etc. — already partially planned above).
- [ ] Piece move sounds, finalized logo/branding, coloured folders.

### Infrastructure (revisit once not under deadline pressure)
- [ ] **SSD reliability** — currently disconnected/unused after repeated corruption (see §2 debugging notes). Likely root cause is the USB enclosure's JMicron bridge chip, not the drive itself; worth trying a different enclosure or a proper NVMe HAT before writing off the drive.
- [ ] Two-node setup with a load balancer (Pi 5 + Pi 2) — genuine learning project for later; Pi 2's 32-bit architecture means current arm64 Docker images would need a separate build target, not a direct redeploy.
- [ ] Multi-stage Docker build to shrink the current ~2.4GB image (works fine as-is, just larger than necessary).
- [ ] `.env.example` file — quick win, first thing a reviewer cloning the repo will look for.
- [ ] Basic integration tests on `auth.ts` (register succeeds / duplicate rejected / wrong password rejected / valid token returned) — small effort, real signal on a CS application.

### Codebase hygiene
- [ ] Rename `repositories/` storage folder back to something less confusingly similar to `repertoires/` (low priority, no functional impact).
- [ ] Confirm `.gitignore` properly covers `apps/api/src/generated/` and compiled output — has been accidentally wiped by `git clean -fd` more than once.
- [ ] Document the Electron/node_modules hoisting workaround somewhere discoverable, so a future broken `npm install` is a known fast fix, not a repeat multi-hour debug.

---

## 6. Legal / Licensing Notes

- Icons via **Flaticon Premium** subscription — Premium tier removes the attribution requirement entirely (confirmed against Flaticon's current terms). License PDFs for each *pack* used are kept in-repo (`assets/licenses/`), which correctly covers every icon in that pack; any individually-downloaded icons (not currently shipped in the app) have their own separate per-icon licenses.
- `documentation/legal.md` currently states an attribution requirement — this predates confirming the Premium tier's actual terms and should be updated to reflect that attribution is not required, while still noting: don't use a Flaticon icon as the app's primary trademarked logo (prohibited regardless of tier), and don't redistribute icons as a raw standalone pack.

---

## 7. Origin / Motivation (for context, not verbatim interview script)

Built out of genuine dissatisfaction with existing chess training tools — most useful features paywalled, free options fragmented across many single-purpose sites. Directly inspired by chessgraph.net's graph-based repertoire modelling (which solves transpositions elegantly but stops there, with no way to actually use the data for training) — ChessBox's novelty finder is the feature that idea was missing. Explicitly a learning project, not a startup attempt: the goal is depth of understanding across the full stack (frontend, backend, infrastructure, deployment) rather than shipping the "next big chess app."
