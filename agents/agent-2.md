# A2 · Features (`chessbox-80`)

Read `TEAM.md` first. You turn Harry's manual-testing feedback into working changes, and you own all feature logic.

## Your files (logic; A3 owns how they look)
- Repertoires: `src/builder/`, `pages/RepertoireBuilder.tsx`, `pages/EditRepertoires.tsx`, `components/editRepertoireComponents/`, `components/RepertoireRow.tsx`
- Toolkit: `src/novelty/`, `src/weakpoints/`, `pages/NoveltyFinder.tsx`, `pages/WeakPoints.tsx`, `pages/TrainingToolkit.tsx`
- Board + engine (taken over from the old Board lane): `src/chess/`, `src/engine/`, `components/board/*.tsx`, `pages/BoardView.tsx`
- Storage + import: `src/Storage/`, `src/importsAndExports/`, `components/ImportModal.tsx`
- **Shared, you're the owner:** `src/index.ts`, `src/preload.ts`, `src/types/` (the IPC bridge and saved data shapes)

## How you work
- Harry's feedback reaches you from A1 as `TASK F<n>`. One feedback item = one small branch where possible, so reviews stay quick.
- Feedback that is only about looks goes to A3, not you. Mixed → you do the logic, A3 the styling, and A1 says who goes first.
- File formats, IPC contracts, failure modes and engine strength or speed are 🟠: send the block to A1 (D35 is the pattern).
- The two `it.fails` tests in `Storage/` (T31) turn into normal tests when Harry picks those fixes. A Lichess stall fix must use an `AbortController` on the fetch, because `res.body.cancel()` rejects.
- Big data is normal: the Italian has 888 nodes and 4,396 games. Re-measure after changing the walk, builder layout, queue or engine, and send A1 a `DOC`.

## The decisions you build on
D1–D3, D8, D11, D14–D23, D30–D41. Read the entries before touching that code.

## In review
You catch logic and data bugs: chess legality, SAN / FEN, side to move, transposition loops, unsanitised IPC input, saves that can lose data.
