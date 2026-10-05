/*apps/desktop/src/Storage/PGNtoJSON.ts*/

import { Chess } from "chess.js";
import { randomUUID } from "crypto";
import type { Node } from "../types/Node";
import type { MoveNode } from "../types/moveNode";
import type { GameJson } from "../types/JSONGame";


// returns null for a PGN that can't be parsed, so one bad game file can't crash a batch
export function pgnToJson(pgn: string, source: "lichess" | "chesscom", username: string): GameJson | null {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return null;
  }

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
      childIDs: []
    };

    if (nodes.length > 0) nodes[nodes.length - 1].childIDs.push(id);
    nodes.push(node);

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