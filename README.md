##ChessBox


As an avid chess player, I find myself dissatisfied with the training tools available. Often the most useful tools are blocked behind paywalls, and the free options are limited. There are so many apps available in this area that offer a couple of useful features, but are mostly bloat or desperately need to be expanded upon. ChessBox is a single envioronment that contains all of the training tools you could ever possibly need, all for free. 

---

## What it does

- **Repertoires as graphs** — import opening repertoires from [chessgraph.net](https://chessgraph.net) JSON exports, organised into folders. Transpositions are explicit edges rather than duplicated lines.
- **Analysis board** - play through lines with variations, legal-move hints, square highlights, and FEN / PGN copy.
- **Game import** - pull your blitz and rapid games from Lichess and Chess.com using the accounts linked in Settings.
- **Accounts** - sign up and sign in; link your Chess.com and Lichess usernames.
- **Features** - the Novelty Finder (walk your games through your repertoires to find where you leave your prep), Analytics, and Training Tools pages.

## Tech stack

| Part | Built with |
|---|---|
| Desktop app | Electron, React, TypeScript, Electron Forge (webpack), react-chessboard, chess.js |
| API | Fastify, tRPC, zod, Prisma, PostgreSQL, Argon2id (hash-wasm), JWT |
| Hosting | Docker Compose on a Raspberry Pi 5, reachable over Tailscale |

The API lives in a separate repository, [chessbox-server](https://github.com/Harryt3nn/chessbox-server), included here as a git submodule at `vendor/chessbox-server` so the desktop app gets full tRPC type inference from the server's router.

## Repository layout

```
ChessBox/
├── apps/desktop/            Electron app (main process, preload, React renderer)
├── documentation/           This README, architecture, roadmap, legal
├── vendor/chessbox-server/  API + shared schemas (git submodule)
└── tsconfig.json            Shared TypeScript config, incl. the @chessbox/shared path mapping
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together and [CHESSBOX_MASTER.md](CHESSBOX_MASTER.md) for design decisions and the roadmap.

## Getting started

### 1. Clone with the submodule

```bash
git clone --recurse-submodules https://github.com/Harryt3nn/ChessBox.git
# or, in an existing clone:
git submodule update --init
```

### 2. Install dependencies

The desktop app compiles the shared schemas straight from the submodule, so both need installing:

```bash
cd vendor/chessbox-server && npm install
cd ../../apps/desktop && npm install
```

### 3. Run the desktop app

```bash
cd apps/desktop
npm start
```

The window opens once the console shows `[ForkTsCheckerWebpackPlugin] No errors found.` A type error stops it from opening, so check the terminal if nothing appears.

The app talks to the API at the address in `apps/desktop/src/trpc.ts`. Signing in needs that API running and reachable (on the tailnet).

To type-check without launching: `npx tsc --noEmit -p tsconfig.json` from the repository root.

### 4. Run the API

Full instructions are in [`vendor/chessbox-server/README.md`](../vendor/chessbox-server/README.md). In short:

```bash
cd vendor/chessbox-server
cp apps/api/.env.example apps/api/.env      # then fill in JWT_SECRET and POSTGRES_PASSWORD
docker compose --env-file ./apps/api/.env up --build
```

Any pending database migrations run automatically when the API container starts.

## Troubleshooting

**`npm start` can't find Electron after an `npm install`.** npm sometimes hoists the `electron` package into a parent `node_modules` instead of `apps/desktop/node_modules`, and Electron Forge only looks in the app's own folder. Copy it back into place:

```powershell
Copy-Item -Recurse ..\..\node_modules\electron .\node_modules\electron
```

**Every page looks unstyled.** CSS Modules are exported in camelCase (`webpack.renderer.config.ts`). If that option is removed, kebab-case class names such as `.topbar-actions` stop matching `styles.topbarActions`.

**Sign-in fails with a validation error right after updating.** The desktop app and the API have to agree on the shape of each call. If a change touches both, deploy the API first.

## Security

Passwords are hashed with Argon2id. Sessions are JWTs, stored on disk encrypted by the OS. The API is rate-limited per IP, and every imported file is sanitised before it touches the disk. The renderer runs sandboxed. The full list is in the Security section of [ARCHITECTURE.md](ARCHITECTURE.md#security).

## License

The code is MIT licensed — see [LICENSE](LICENSE). The icons in `apps/desktop/src/assets/icons/` are Flaticon assets under a Premium license and are **not** covered by the MIT license; see [legal.md](legal.md).
