/*apps/desktop/src/Storage/PGNtoJSON.ts*/

import { Chess } from "chess.js";
import { randomUUID } from "crypto";
import type { Node } from "../types/Node";
import type { MoveNode } from "../types/moveNode";

export interface GameJson {
  id: string;
  source: "lichess" | "chesscom";
  username: string;
  nodes: Node[];
  moveTree: MoveNode;
  tags: Record<string, string>;
}

export function pgnToJson(
  pgn: string,
  source: "lichess" | "chesscom",
  username: string
): GameJson {
  const chess = new Chess();
  chess.loadPgn(pgn);

  const rawTags = chess.header();

 // null handling
  const tags: Record<string, string> = Object.fromEntries(
    Object.entries(rawTags).map(([k, v]) => [k, v ?? ""])
  );

  const moves = chess.history();
  const nodes: Node[] = [];
  const moveNodes: MoveNode[] = [];

  const temp = new Chess();
  let parentId: string | null = null;

  for (const move of moves) {
    temp.move(move);

    const id = randomUUID();
    const fen = temp.fen();

    const node: Node = {
      id,
      parentId,
      move,
      children: [],
      annotations: {
        comment: "",
        eval: undefined,
        tags: []
      }
    };

    nodes.push(node);

    if (parentId) {
      const parent = nodes.find(n => n.id === parentId);
      if (parent) parent.children.push(id);
    }

    parentId = id;

    moveNodes.push({
      id,
      move,
      fen,
      children: []
    });
  }


  for (let i = 0; i < moveNodes.length - 1; i++) {
    moveNodes[i].children.push(moveNodes[i + 1]);
  }

  const moveTree = moveNodes[0] ?? {
    id: randomUUID(),
    move: "",
    fen: chess.fen(),
    children: []
  };

  return {
    id: randomUUID(),
    source,
    username,
    nodes,
    moveTree,
    tags
  };
}