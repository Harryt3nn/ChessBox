/*apps/desktop/src/types/moveNode.ts*/


export type MoveNode = {
  id: string;
  move: string;         // SAN, e.g. "Nf3"
  fen: string;           // board position AFTER this move
  children: MoveNode[];  // possible continuations from this position (children[0] is the main line)
  comment?: string;      // PGN comment after the move, e.g. { best by test }
  nags?: string[];       // PGN annotation glyphs, e.g. ["$1"] for "!"
};
