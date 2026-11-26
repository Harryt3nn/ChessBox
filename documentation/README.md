# ChessBox

ChessBox is a free desktop app for chess training, built around your own opening repertoires and your own games. Repertoires are stored as graphs rather than trees, so a position reached by two move orders is one position, not two copies. The Novelty Finder walks your imported Lichess and Chess.com games through a repertoire and shows where you, or your opponent, left your preparation. WeakPoints then drills those positions with spaced repetition.

It is a personal project by Harry Tennant, a computer science student at Newcastle University. It was built to train with, and to learn system design, desktop development and self-hosting.

## Why it exists

Many of the training tools I wanted are paywalled, and the free ones are spread across many sites that each do one thing. ChessBox puts the tools I use in one place, driven by my own game data.

The graph model comes from [chessgraph.net](https://chessgraph.net), which represents repertoires as graphs to handle transpositions. ChessBox imports its JSON format and adds what it was missing for me: a way to use that data, by checking your own games against it.

## Features

**Repertoires**
- Import chessgraph.net JSON exports, organised into folders.
- A visual graph builder to create, rename and delete repertoires and moves, with collapsible branches for large repertoires.
- One prepared reply per position on your move, so matching a game against a repertoire is deterministic.
- Open any repertoire in the analysis board, and jump between a board position and its node in the graph.

**Analysis board**
- Lichess-style board with variations, legal-move hints, FEN and PGN copy.
- Stockfish running locally in a Web Worker, with an eval bar and the best lines.
- Captured pieces and the material difference shown beside the board.

**Novelty Finder**
- Checks one game or every imported game against the repertoire you pick, using the accounts you choose.
- Reports where you deviated from your prep and where the opponent played something your repertoire doesn't cover, following transpositions.
- Checks each deviation with a full-strength Stockfish search in the background, and lets you add a move to the repertoire or open it on the board.

**WeakPoints**
- Drills positions from your deviations, from lines you rarely reach and from lines you know well, as short move sequences on a board with no analysis.
- Schedules reviews with FSRS, the spaced-repetition algorithm also available in Anki.
- Three modes: Focused, Mistakes only and Random, limited to one opening branch or the whole repertoire.

**Accounts**
- Sign up and sign in, with the session stored encrypted by the operating system.
- Link your Lichess and Chess.com usernames, and change your username or password from one settings page.

## Tech stack

| Part | Built with |
|---|---|
| Desktop app | Electron, React, TypeScript, Electron Forge (webpack), react-chessboard, chess.js, React Flow |
| Engine | Stockfish (WebAssembly, in a Web Worker) |
| Training | ts-fsrs |
| API | Fastify, tRPC, zod, Prisma, PostgreSQL, Argon2id (hash-wasm), JWT |
| Hosting | Docker Compose on a Raspberry Pi 5, reached over Tailscale |
| Tests | Vitest, for both the desktop app and the API |

Analysis runs on your machine. The server only handles accounts, so your repertoires and games stay on disk under `%APPDATA%/ChessBox/ChessBox-data/`.

The API lives in a separate repository, [ChessBox-Server](https://github.com/Harryt3nn/ChessBox-Server). It is included here as a git submodule at `vendor/chessbox-server`, so the desktop app gets full tRPC type inference from the server's router.

## Repository layout

```
ChessBox/
├── apps/desktop/            Electron app (main process, preload, React renderer)
├── documentation/           This README, architecture, roadmap, legal
├── vendor/chessbox-server/  API + shared schemas (git submodule)
└── tsconfig.json            Shared TypeScript config, incl. the @chessbox/shared path mapping
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together and [CHESSBOX_MASTER.md](CHESSBOX_MASTER.md) for the design notes.

## Getting started

### Clone with the submodule

```bash
git clone --recurse-submodules https://github.com/Harryt3nn/ChessBox.git
# or, in an existing clone:
git submodule update --init
```

### Install dependencies

The desktop app compiles the shared schemas straight from the submodule, so both need installing:

```bash
cd vendor/chessbox-server && npm install
cd ../../apps/desktop && npm install
```

### Run the desktop app

```bash
cd apps/desktop
npm start
```

The window opens once the console shows `[ForkTsCheckerWebpackPlugin] No errors found.` A type error stops it from opening, so check the terminal if nothing appears.

The app talks to the API at the address in `apps/desktop/src/trpc.ts`. Signing in needs that API running and reachable on the tailnet.

### Run the tests

```bash
cd apps/desktop && npm test                               # desktop
cd vendor/chessbox-server/apps/api && npm test            # API
npx --prefix apps/desktop tsc --noEmit -p tsconfig.json   # type-check, from the repository root
```

### Run the API

Full instructions are in [`vendor/chessbox-server/README.md`](../vendor/chessbox-server/README.md). In short:

```bash
cd vendor/chessbox-server
cp apps/api/.env.example apps/api/.env      # then fill in every value
docker compose --env-file ./apps/api/.env up --build
```

Pending database migrations run automatically when the API container starts.

## Troubleshooting

**`npm start` can't find Electron after an `npm install`.** npm sometimes hoists the `electron` package into a parent `node_modules` instead of `apps/desktop/node_modules`, and Electron Forge only looks in the app's own folder. Copy it back into place:

```powershell
Copy-Item -Recurse ..\..\node_modules\electron .\node_modules\electron
```

**Every page looks unstyled.** CSS Modules are exported in camelCase (`webpack.renderer.config.ts`). If that option is removed, kebab-case class names such as `.topbar-actions` stop matching `styles.topbarActions`.

**Sign-in fails with a validation error right after updating.** The desktop app and the API have to agree on the shape of each call. If a change touches both, deploy the API first.

## Security

- Passwords are hashed with Argon2id, and login takes the same time whether or not the username exists.
- Sessions are JWTs, stored on disk encrypted by the operating system. Changing your password signs out your other devices.
- Login and registration are rate-limited, and browsers can only call the API from an allow-list of origins (CORS).
- The renderer runs sandboxed, and the main process re-checks everything that arrives over IPC or from an imported file.
- The API is meant to be reached only over Tailscale, and the database is never exposed outside its Docker network.

The full list is in the Security section of [ARCHITECTURE.md](ARCHITECTURE.md#security).

## Credits

- Repertoire graph model and import format: [chessgraph.net](https://chessgraph.net).
- Engine: [Stockfish](https://stockfishchess.org) (GPL-3.0). Its licence text will ship with packaged releases.
- Spaced repetition: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs).

ChessBox is not affiliated with or endorsed by Chess.com or Lichess. It reads public game data through their published APIs.

What ChessBox stores and sends is described in [PRIVACY.md](PRIVACY.md).

## License

The code is MIT licensed, see [LICENSE](LICENSE). The icons in `apps/desktop/src/assets/icons/` are Flaticon assets used under a Premium licence and are **not** covered by the MIT licence; see [legal.md](legal.md).
