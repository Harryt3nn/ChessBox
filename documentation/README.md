##ChessBox


As an avid chess player, I find myself dissatisfied with the training tools available. Often the most useful tools are blocked behind paywalls, and the free options are limited. There are so many apps available in this area that offer a couple of useful features, but are mostly bloat or desperately need to be expanded upon. ChessBox is a single envioronment that contains all of the training tools you could ever possibly need, all for free. 

My name is Harry Tennant and I'm currently a student at Newcastle University, studying computer science. This is a project to help develop my skills in programming, system design, and familiarise myself with industry standard softwares that I wouldn't get the chance to try out ion the classroom. When I began development, I had quite a few unique ideas (which have since been formally published by teams of developers). The goal of this project isn't to make the next big app in the chess world, that will kickstart a startup and make a career. My aims are to learn as much as possible and have fun! I first came up with the idea for this app when I wanted to start getting back into competetive play, and wanted a place to train based on my own game data. There are plenty of options that exist, but most of the genuinely useful features are locked behind a paywall. Furthermore, I didn't like switching between websites for single useful features. I wanted a single envioronment that had features tailored to my specific needs and contained all of the features I personally wanted (both ones that exist and ones that don't.)

The first peice of inspiration comes from a website called chess graph. This site has a unique concept of modelling chess games as graphs, not trees, as this accounts for transpositions. I had fun using the GUI to add repertoires from various courses and my own experience into one set repertoire. There were a couple of standout complaints, such as the site only supporting an export of JSON and not a PGN. Looking at the repository, it's clear that a lot of the code is AI generated, which is not necessarily a bad thing. In this age of computer science, avoiding AI is impossible, but its a slippery slope. Too much reliance on AI means you don't really have any skills. Too much avoidance and you'll simply fall behind. It's a fact that AI can write better code than all junior devlopers and it is only getting better. I believe 'agentic workflow' is simple a fad that will dissappear in the near future. Knowledge of systenm design and technologies that support developers is a far more valublee skill than coding now, as AI can never replicate human creativity when it comes to problem solving. Genuinely new ideas that can take humanity forward will not come from AI, but from humans building things with the tools we have available. AI is just another one of those tools. Chess graph was also seemingly missing a way to expand or use the data in any meaningful way. Tghis is where I came up with the novelty finder idea, using game data, graph traversal and Stockfish analysis. 

---

## What it does

- **Repertoires as graphs** — import opening repertoires from [chessgraph.net](https://chessgraph.net) JSON exports, organised into folders. Transpositions are explicit edges rather than duplicated lines.
- **Analysis board** — play through lines with variations, legal-move hints, square highlights, and FEN / PGN copy.
- **Game import** — pull your blitz and rapid games from Lichess and Chess.com using the accounts linked in Settings.
- **Accounts** — sign up, sign in with username or email, email verification, forgotten-password reset, change password, sign out of every device.
- **Designed, being built** — the Novelty Finder (walk your games through your repertoires to find where you leave your prep), Analytics, and Training Tools pages.

## Tech stack

| Part | Built with |
|---|---|
| Desktop app | Electron, React, TypeScript, Electron Forge (webpack), react-chessboard, chess.js |
| API | Fastify, tRPC, zod, Prisma, PostgreSQL, Argon2id (hash-wasm), JWT, Nodemailer |
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
cp apps/api/.env.example apps/api/.env      # then fill in JWT_SECRET, POSTGRES_PASSWORD, SMTP_*
docker compose --env-file ./apps/api/.env up --build
```

Database migrations run automatically when the API container starts.

## Troubleshooting

**`npm start` can't find Electron after an `npm install`.** npm sometimes hoists the `electron` package into a parent `node_modules` instead of `apps/desktop/node_modules`, and Electron Forge only looks in the app's own folder. Copy it back into place:

```powershell
Copy-Item -Recurse ..\..\node_modules\electron .\node_modules\electron
```

**Every page looks unstyled.** CSS Modules are exported in camelCase (`webpack.renderer.config.ts`). If that option is removed, kebab-case class names such as `.topbar-actions` stop matching `styles.topbarActions`.

**Sign-in fails with a validation error right after updating.** The desktop app and the API have to be on matching versions. Deploy the API first.

**Verification or reset codes never arrive.** The API needs SMTP settings in `apps/api/.env`. Without them, codes are printed to the API log in development and can't be sent at all in production.

## Security

Passwords are hashed with Argon2id. Sessions are revocable JWTs, stored on disk encrypted by the OS. Every endpoint is rate-limited, and every imported file is sanitised before it touches the disk. The renderer runs sandboxed. The full list is in the Security section of [ARCHITECTURE.md](ARCHITECTURE.md#security).

## License

The code is MIT licensed — see [LICENSE](LICENSE). The icons in `apps/desktop/src/assets/icons/` are Flaticon assets under a Premium license and are **not** covered by the MIT license; see [legal.md](legal.md).
