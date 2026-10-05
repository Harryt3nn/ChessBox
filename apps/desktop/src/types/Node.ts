/*apps/desktop/src/types/Node.ts*/
export interface Node {
  id: string;
  parentId: string | null;
  move: string | null;
  childIDs: string[];

  // optional chessgraph (v3) fields, kept on import when present
  repertoireId?: string;
  fen?: string;
  comment?: string;
  color?: string;
  tags?: string[];
  transpositionEdges?: { targetId: string; move: string }[];
  arrows?: { startSquare: string; endSquare: string; color: string }[];
  highlightedSquares?: { square: string; color: string }[];
}
