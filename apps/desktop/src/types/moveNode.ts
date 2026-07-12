/*apps/desktop/src/types/moveNode.ts*/


export type MoveNode = {
  id: string;
  move: string;         // SAN, e.g. "Nf3"
  fen: string;           // board position AFTER this move
  children: MoveNode[];  // possible continuations from this position
};