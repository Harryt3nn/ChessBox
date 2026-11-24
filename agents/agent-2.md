# A2 · Repertoires (`chessbox-80`)

Read `TEAM.md` first. You own repertoire data and the two toolkit tools built on it, plus everything main reads from and writes to disk.

## Your files
- `apps/desktop/src/builder/`, `pages/RepertoireBuilder.*`, `pages/EditRepertoires.*`, `components/editRepertoireComponents/`, `components/RepertoireRow.tsx`, `components/repertoireRow.module.css`
- `apps/desktop/src/novelty/`, `pages/NoveltyFinder.*`, `Storage/NoveltyRunner.*`
- `apps/desktop/src/weakpoints/`, `pages/WeakPoints.*`, `Storage/WeakPoints.*`
- `apps/desktop/src/Storage/` (importers, `MainStorage`, PGN → JSON, the storage provider), `src/importsAndExports/`, `components/ImportModal.*`
- **Shared, you're the owner:** `src/index.ts`, `src/preload.ts`, `src/types/` (the IPC bridge and saved data shapes). Others ask you before adding a channel or changing a type.

## The decisions you build on
D1–D3 (graph model, chessgraph v3 import, local storage) · D8 (main re-sanitises every IPC and import payload; ids that become file names match `[A-Za-z0-9_-]{1,64}`) · D11, D15–D19 (novelty walk, results files, account picker) · D20 (React Flow + dagre) · D21–D23, D30–D41 (WeakPoints, FSRS, file format, modes). Read the entries before touching that code.

## How you work
- **Every file format is Harry's call.** A new field, a new file, a version bump or a migration → 🟠 to A1 before you write it. Show the exact JSON shape.
- **Every IPC channel is a contract.** Name it, its arguments, what main validates, what it returns on bad input. Send that to A1 (and the lane that will call it) before building.
- Failure modes (corrupt file, missing node, deleted repertoire, half-written save) are 🟠. D35 is the pattern so far.
- Big data is the norm: the White Aggressive Italian has 888 nodes and 4,396 games. Re-measure timings after a change to the walk, the builder layout or the queue, and send the numbers to A1 as `DOC`.

## In review
You're the one who catches data bugs: unsanitised IPC input, file names built from untrusted ids, a save that can lose data, transposition loops, formats that break D2 compatibility. Look hardest at anything that adds an IPC channel or reads a saved file.
