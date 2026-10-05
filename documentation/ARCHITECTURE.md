# ChessBox — Architecture

## Overview

ChessBox is a desktop app built with **Electron + React + TypeScript** using Electron Forge
with the webpack-typescript template. Repertoires, positions and imported games are stored
locally on disk. Accounts live on a small self-hosted API (Fastify + tRPC + PostgreSQL in
Docker on a Raspberry Pi, reached over Tailscale), which handles sign-in, email
verification, password management and linked Chess.com / Lichess usernames.

The project is two git repositories:

| Repository | Path | Contents |
|---|---|---|
| `ChessBox` | this repo | Electron desktop app (`apps/desktop`) and documentation |
| `chessbox-server` | `vendor/chessbox-server` (git submodule) | API (`apps/api`) and shared zod schemas / router type (`packages/shared`) |

The desktop app imports `@chessbox/shared` for input schemas and the tRPC `AppRouter`
type, so client and server share one definition of every API call.


Tech Stack
{
  "Electron"
  "React"
  "TypeScript"
  "Fastify"
  "tRPC"
  "PostgreSQL"
  "Prisma ORM"
  "zod"
  "hash-wasm (Argon2id)"
  "JWT"
  "Nodemailer (SMTP)"
  "Docker"
  "Tailscale"
}

---

## Process Model

Electron runs two separate processes:

### Main Process (`src/index.ts`)
- Runs in Node.js — has full filesystem and OS access
- Creates the `BrowserWindow`
- Registers all **IPC handlers** (`ipcMain.handle`) that the renderer calls
- Handles all direct file I/O via `MainStorage.ts`
- Handles file dialogs via `dialog.showOpenDialog`
- Runs the Lichess / Chess.com game importers

### Renderer Process (`src/renderer.tsx`, `src/pages`, `src/components`)
- Runs **sandboxed** (`sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`) —
  no Node or filesystem access at all
- All React components and pages live here
- Talks to the main process only through `window.storage.*` and `window.api.*`
  (see IPC Bridge below), and to the server through the tRPC client (`src/trpc.ts`)

---

## IPC Bridge

Because the renderer is sandboxed, it cannot call Node APIs directly.
The bridge works in three layers:

```
Renderer (React)
    ↓ calls
window.storage.loadFolders()
    ↓ defined in
preload.ts  (contextBridge exposes window.storage and window.api)
    ↓ sends
ipcRenderer.invoke("storage:loadFolders")
    ↓ handled by
ipcMain.handle("storage:loadFolders")  in index.ts
    ↓ reads disk via
MainStorage.ts / fs.promises
```

The main process treats everything arriving over IPC as untrusted — see
[Import Sanitisation](#import-sanitisation) and [Security](#security).

### IPC Handlers registered in `index.ts`

| Handler                     | Description                                                                 |
|-----------------------------|-----------------------------------------------------------------------------|
| `storage:loadFolders`       | Reads `folders.json`, returns array of Folder                               |
| `storage:saveFolders`       | Sanitises, then writes the folders array to `folders.json`                  |
| `storage:loadRepertoires`   | Reads each `.json` file in `repertoires/`, returns array                    |
| `storage:saveRepertoire`    | Sanitises, then writes a single repertoire as `{id}.json` in `repertoires/` |
| `storage:openFileDialog`    | Opens native file picker, returns (and remembers) the selected paths        |
| `storage:readFile`          | Reads a file **only if it was picked in the file dialog**, max 20 MB        |
| `storage:importRepertoires` | Sanitises, then merges imported folders, repertoires and nodes into storage |
| `storage:saveAuthToken`     | Encrypts the session JWT with `safeStorage` and writes `auth.token`         |
| `storage:loadAuthToken`     | Decrypts and returns the saved JWT, or null                                 |
| `storage:clearAuthToken`    | Deletes `auth.token`                                                        |
| `import-lichess`            | Downloads the user's blitz + rapid games from Lichess as `.pgn` files       |
| `import-chesscom`           | Downloads the user's blitz + rapid games from Chess.com as `.pgn` files     |

---

## Storage Layer (Renderer Side)

The renderer never calls `window.storage` directly. Instead it goes through an
abstraction layer:

### `StorageProvider` (interface)
Defines the contract: `loadFolders`, `saveFolders`, `loadRepertoires`, `saveRepertoire`.

### `FileSystemStorageProvider` (implements StorageProvider)
Implements the interface by delegating each method to `window.storage.*` IPC calls.
This is the only implementation currently. A mock implementation could be created for
testing without touching the filesystem.

### Usage in components
```typescript
const storage = useMemo(() => new FileSystemStorageProvider(), []);
const folders = await storage.loadFolders();
```

---

## Data Storage on Disk

All data lives under:
```
%APPDATA%/ChessBox/ChessBox-data/     (Windows: AppData/Roaming/ChessBox/ChessBox-data)
├── folders.json                # { "folders": [Folder, ...] }
├── nodes.json                  # Map of nodeId → Node (all nodes across all repertoires)
├── repertoires/                # One .json file per repertoire
│   ├── {repertoire-id}.json
│   └── ...
├── auth.token                  # Session JWT, encrypted with Electron safeStorage (OS-level)
└── games/
    ├── lichess/{username}/{game-id}.pgn
    └── chesscom/{username}/{game-uuid}.pgn
```

If a JSON file can't be parsed it is renamed to `<name>.corrupt-<timestamp>` and the app
carries on without it, so one damaged file can neither crash the app nor be silently
overwritten.

### `folders.json` format
```json
{
  "folders": [
    {
      "id": "uuid",
      "name": "Harry's WB",
      "collapsed": false,
      "sortOrder": 1,
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ]
}
```

### `repertoires/{id}.json` format
```json
{
  "id": "uuid",
  "name": "White Aggressive Italian",
  "side": "white",
  "rootNodeId": "uuid",
  "folderId": "uuid-of-parent-folder",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

### `nodes.json` format
```json
{
  "node-uuid": {
    "id": "uuid",
    "repertoireId": "uuid",
    "move": "e4",
    "fen": "rnbqkbnr/...",
    "comment": "",
    "color": "#3f3f46",
    "tags": [],
    "parentId": "uuid",
    "childIDs": ["uuid", "uuid"],
    "transpositionEdges": [{ "targetId": "uuid", "move": "Nxd4" }],
    "arrows": [{ "startSquare": "b1", "endSquare": "c3", "color": "blue" }],
    "highlightedSquares": [{ "square": "f7", "color": "red" }]
  }
}
```

Note: chessgraph exports use `childIds` (and older data `children`) instead of `childIDs`,
and export nodes as an **array** rather than a map. The import sanitiser accepts all of
these and normalises them to `childIDs` in a `Record<id, Node>`. Nodes saved before this
change may still carry `childIds` / `children` until they are next imported.

---

## Data Model

```
Folder (1)
  └── Repertoire (many)  — linked by repertoire.folderId === folder.id
        └── Node (many)  — linked by node.repertoireId === repertoire.id
                         — tree structure via node.childIDs (array of child node IDs)
                         — transpositions via node.transpositionEdges
                         — root node identified by repertoire.rootNodeId
```

Repertoires with `folderId: null` are shown in the permanent **Uncategorised** folder
(id: `__uncategorised__`), which cannot be deleted.

All ids that become file names (repertoires, games) must match `[A-Za-z0-9_-]{1,64}`.

---

## Import Pipeline (ChessGraph JSON)

ChessGraph exports a single JSON file. The import flow is:

```
User picks file (EditRepertoires → "Import JSON")
    ↓
storage:readFile               — main process: only dialog-picked files, max 20 MB
    ↓
JSON.parse                     — bad JSON → "File is not in a valid format"
    ↓
validateChessGraphExport()     — quick shape check: version, repertoires, nodes
    ↓
prepareForImport()             — runs sanitiseImport() (below), expands folders
    ↓
ImportModal                    — shows any sanitiser warnings; user selects repertoires
                               — folders and nodes are always included
    ↓
storage:importRepertoires      — main process runs sanitiseImport() AGAIN on the payload
    ↓
importRepertoires()            — merges into existing storage; existing ids always win
    ↓
reloadData()                   — refreshes React state from disk
```

### Import Sanitisation

`src/importsAndExports/sanitiseImport.ts` is pure TypeScript (no Node or DOM APIs), so the
renderer and main process run the same code. It:

- restricts every id to `[A-Za-z0-9_-]{1,64}` — ids become file names, so `../` tricks are impossible
- type-checks every field, length-caps strings, and drops unknown fields
- keeps the chessgraph extras (`fen`, `comment`, `color`, `tags`, `transpositionEdges`,
  `arrows`, `highlightedSquares`), validating squares as `a1`–`h8` and moves as SAN characters
- removes links to missing nodes / folders and skips repertoires whose root node is missing
- cuts cycles in the move graph (iterative DFS, so a very deep line can't overflow the stack)
- rejects files over the limits in `IMPORT_LIMITS` (20 MB, 250k positions, 5k repertoires, 1k folders)

Anything dropped or repaired is reported as a warning in the import modal rather than
failing the whole import. If nothing usable is left it throws an `ImportError` with a
readable message.

### Game imports (Lichess / Chess.com)

Run in the main process, triggered from the Novelty Finder page. Each game is checked
individually — a malformed line, bad JSON, unsafe id or oversized PGN (>200 KB) skips that
one game rather than ending the import. Chess.com archive links are only followed if they
point back at `https://api.chess.com/pub/player/...`. Games already on disk are skipped.
`pgnToJson()` returns `null` for a PGN that chess.js can't parse.

---

## Server API (`vendor/chessbox-server`)

```
Desktop (tRPC client, src/trpc.ts)
    ↓ HTTP over Tailscale :3001, Authorization: Bearer <JWT>
Fastify  — CORS allow-list, 64 KB body limit, global 300 req/min/IP limit, security headers
    ↓
tRPC     — createContext() resolves the session (JWT signature + tokenVersion check)
    ↓
routers  — auth, connections, user  (inputs validated with @chessbox/shared zod schemas)
    ↓
Prisma   → PostgreSQL (Docker, not exposed outside the compose network)
```

### Procedures

| Procedure | Access | Description |
|---|---|---|
| `auth.register` | public | Create account, email a verification code, return a session token |
| `auth.login` | public | Sign in with username **or** email |
| `auth.me` | signed in | Current user (never includes the password hash) |
| `auth.verifyEmail` | signed in | Confirm the email with the 6-digit code |
| `auth.resendVerification` | signed in | Send a fresh verification code |
| `auth.requestPasswordReset` | public | Email a reset code (always reports success — no account enumeration) |
| `auth.resetPassword` | public | Set a new password with the emailed code; signs out every session |
| `auth.changePassword` | signed in | Change password (needs current one); signs out other sessions, returns a new token |
| `auth.logoutEverywhere` | signed in | Revoke every session for the account |
| `connections.connectLichess` | verified email | Check the Lichess account exists, save the username |
| `connections.connectChesscom` | verified email | Check the Chess.com account exists, save the username |
| `user.me` | signed in | Same safe field selection as `auth.me` |

### Sessions

JWTs (HS256, 3-day expiry) carry the user id and a `tokenVersion`. Every request re-reads
the user's current `tokenVersion`; a token with an older version is rejected. Changing or
resetting the password, or "Sign Out All", increments it — which is how sessions on other
devices are revoked without a token blacklist.

### Email codes

Verification and reset codes are 6 random digits, stored only as a SHA-256 hash in the
`EmailCode` table, valid for 15 minutes, single-use, and destroyed after 5 wrong guesses.
The desktop app is not a website, so the user types the code in rather than clicking a link.

---

## Security

| Area | Measure |
|---|---|
| Passwords | Argon2id (64 MB, 3 iterations); 8–64 characters; constant-time login via a dummy hash when the account doesn't exist |
| Rate limiting | Global 300/min/IP; login 10 per 15 min per IP **and** per account; register 5/hour/IP; emails 10/hour/IP and 3 per 15 min per address; code attempts 20 per 15 min/IP; password change 5 per 15 min/user; chess account linking 10 per 15 min/user |
| Sessions | Pinned HS256, `tokenVersion` revocation, token encrypted at rest with `safeStorage` |
| Server errors | No stack traces and generic messages for internal errors in production; readable validation messages |
| Server config | Refuses to start without `JWT_SECRET` (≥32 chars) and `DATABASE_URL`; runs as non-root in Docker |
| Network | API only reachable on the tailnet; Postgres not published; CORS allow-list (`CORS_ORIGINS`) |
| Upstream calls | Chess usernames limited to `[A-Za-z0-9_-]`, URL-encoded, 8 s timeout |
| Electron | Sandboxed renderer, no Node integration, new windows / navigation / webviews blocked |
| Local files | Renderer can only read dialog-picked files; ids validated before becoming file names; IPC payloads re-sanitised in main |

Rate limits are held in memory in the single API process, so they reset when it restarts.

---

## Pages & Navigation

Navigation is a single `useState<Page>` in `App.tsx` — there is no router. Every page
renders the persistent `Sidebar`, which calls `setPage`.

### Page tree
```
App.tsx
├── LogIn overlay           — sign in / sign up / forgot password (shown when signed out)
├── VerifyEmail overlay     — shown when signed in with an unverified email
├── Home.tsx                — shortcut cards to every section
├── EditRepertoires.tsx     — repertoire file browser, JSON import
├── BoardView.tsx           — analysis board
├── NoveltyFinder.tsx       — game import; deviations / novelties panels (designed, not built)
├── Analytics.tsx           — filters, stat tiles, openings / coverage panels (designed, not built)
├── TrainingToolkit.tsx     — planned training tools, marked "Coming soon"
└── Settings.tsx            — ProfileCard, connect Chess.com / Lichess, SecurityCard
```

### Shared UI
- `PageHeader` — framed section icon, amber title, subtitle, actions slot
- `PageShared.module.css` — panels, stat tiles, segmented toggles, buttons, empty states, feature cards
- `Icon` — draws a monochrome Flaticon glyph as a CSS mask so it takes the text colour
  (full-colour Flaticon illustrations are plain `<img>`s)
- CSS Modules are exported in camelCase (`exportLocalsConvention: 'camelCase'`), so
  `.topbar-actions` is used as `styles.topbarActions`
- Colours are CSS variables in `index.css` (art deco palette: charcoal-emerald surfaces,
  brass/amber accent, garnet for alerts, sage reserved for Chess.com)
- Toasts: `react-hot-toast`, `<Toaster />` mounted in `App.tsx`

---

## Key Components

| Component | Description |
|---|---|
| `SidebarModule.tsx` | Persistent left navigation (buttons in `components/buttons/`) |
| `logIn.tsx` | Sign in / sign up / forgot password / reset password modal |
| `VerifyEmail.tsx` | Enter or resend the email verification code |
| `profileCard.tsx` | Username, email, linked accounts, log out |
| `SecurityCard.tsx` | Change password, sign out everywhere |
| `FolderSelection.tsx` | Renders a single folder row with its repertoires |
| `RepertoireRow.tsx` | Renders a single repertoire inside a folder (double-click to rename) |
| `ImportModal.tsx` | Checkbox UI for selecting which repertoires to import, shows sanitiser warnings |
| `RepList.tsx` | Simple debug/alternate list view of folders and repertoires |

---

## Known Quirks

- `BoardView.tsx` auto-scroll looks for `.move-active` with `querySelector`, which never
  matches the CSS Modules class `styles.moveActive` — the move list doesn't scroll to the
  active move yet.
- `importANB.tsx` is an unfinished copy of `ImportModal.tsx` (no selection UI yet) and
  isn't used anywhere.
- `ImportModal.tsx` uses plain global class names that have no styles yet.
- `index.html` and `forge.config.ts` CSPs still allow `unsafe-eval` and the dev server
  websocket — both need tightening before packaging.
- ChessGraph v3 exports `nodes` as an array; earlier versions may differ.
- Sidebar icons are drawn with `filter: invert(1)`, which turns the full-colour Flaticon
  illustrations into colour negatives; page headers show them in their real colours.

---

## ANALYSIS BOARD ------------------------------------------------------

`BoardView.tsx` — a `react-chessboard` (v4) board backed by `chess.js`, with no engine yet.

- Moves are stored as a `MoveNode` tree (`GameTree` in `types/gameTree.ts`), so playing a
  different move from an earlier position creates a variation rather than overwriting
- Click a piece to see legal-move dots; drag or click to move
- Right-click squares to highlight them (kept separate from legal-move highlights)
- Arrow keys step backwards / forwards through the current line
- Variations at the current position are listed and clickable
- SAN move list, plus FEN and PGN views with copy-to-clipboard

---
