/*apps/desktop/src/types/gameTree.ts*/


import type { MoveNode } from '../types/moveNode';

// ---------------------------------------------------------------------------
// GAME TREE TYPES
// ---------------------------------------------------------------------------
// The game is stored as a tree of MoveNodes rather than a flat list, allowing
// for variations. The root is a virtual "before any moves" node — its FEN is
// the starting position and its move is an empty string. currentPath is the
// list of node IDs from root down to whatever position is currently displayed.
// An empty path means we're at the root.


export type GameTree = {
  root: MoveNode;
  currentPath: string[];
};

