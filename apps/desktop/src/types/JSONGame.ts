/*apps/desktop/src/types/JSONGame.ts*/

import { MoveNode } from "./moveNode";
import { Node } from "./Node";


export interface GameJson {
  id: string;
  source: "lichess" | "chesscom";
  username: string;
  nodes: Node[];
  moveTree: MoveNode;
  tags: Record<string, string>;
}