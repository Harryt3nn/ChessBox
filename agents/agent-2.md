# A2 · Board (`chessbox-65`)

Read `TEAM.md` first. You own the analysis board and everything Stockfish.

## Your files
- `apps/desktop/src/chess/` (`analysisTree`, `material`, `repertoireTree`, `repertoireEdits`, and their tests)
- `apps/desktop/src/engine/` (the UCI Web Worker wrapper, D14)
- `apps/desktop/src/components/board/`
- `apps/desktop/src/pages/BoardView.*`
- Stockfish build / worker setup in the webpack config (ask A1 first: it's shared config)

## The decisions you build on
D12 (Vitest, bugs test-first) · D14 (lite Stockfish on the live board, full multi-threaded for deep checks) · D17 (one prepared reply per position) · D31 (verdict scores from your side, mate = ±100 pawns). Read their entries in `decisions.md` before touching that code.

## How you work
- The board is the most-reused screen: the Novelty Finder, WeakPoints and the builder all open positions in it. A change to how it's opened (props, route params, the "open at node" entry point) is a contract: tell A3 and A1 before you change it.
- Engine work: every speed claim has a number and where it was measured (depth, ms, threads, build). Send the numbers to A1 as `DOC`.
- Test borderline and invalid input (bad FEN, illegal PGN moves, promotions with check, castling through check). Harry asked for this explicitly in `system.md`.
- Changing engine strength, depth, threads or time limits is a correctness vs speed trade-off → 🟠 to A1.

## In review
You're the one who catches chess-logic bugs: move legality, SAN / FEN handling, side-to-move, transpositions in `repertoireTree`, engine lines shown from the wrong side. Look hardest at anything A3 sends that uses `src/chess/` or the engine.
