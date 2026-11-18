import { describe, expect, it } from 'vitest';
import { DEFAULT_POSITION } from 'chess.js';
import type { Node } from '../types/Node';
import type { Repertoire } from '../types/Repertoire';
import type { GameTree } from '../types/gameTree';
import { getNodeAtPath, playMove } from './analysisTree';
import { repertoireToTree } from './repertoireTree';
import { collectRepertoireEdits } from './repertoireEdits';

const FEN_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const FEN_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

const rep = (side: 'white' | 'black'): Repertoire => ({ id: 'rep', name: 'Test', side, rootNodeId: 'root', folderId: null, createdAt: 0, updatedAt: 0 });

// a white repertoire: 1.e4 e5, saved with chessgraph's childIds like the real files
function whiteGraph(): Record<string, Node> {
  return {
    root: { id: 'root', repertoireId: 'rep', parentId: null, move: null, fen: DEFAULT_POSITION, childIds: ['e4'] } as unknown as Node,
    e4: { id: 'e4', repertoireId: 'rep', parentId: 'root', move: 'e4', fen: FEN_E4, childIDs: ['e5'] },
    e5: { id: 'e5', repertoireId: 'rep', parentId: 'e4', move: 'e5', fen: FEN_E4_E5, childIDs: [] },
  };
}

/** plays `moves` (from/to pairs) on the board from `path` */
function play(tree: GameTree, path: string[], moves: [string, string][]): GameTree {
  let t: GameTree = { ...tree, currentPath: path };
  for (const [from, to] of moves) {
    const next = playMove(t, { from, to });
    if (!next) throw new Error(`illegal ${from}${to}`);
    t = next;
  }
  return t;
}

describe('collectRepertoireEdits', () => {
  it('finds nothing to save when the board only shows the repertoire', () => {
    const nodes = whiteGraph();
    const { tree } = repertoireToTree('root', nodes);
    expect(collectRepertoireEdits(tree, rep('white'), nodes)).toEqual({ patch: {}, added: 0, transpositions: 0, rejected: [] });
  });

  it('adds new moves as nodes under the right parent, normalising the parent to childIDs', () => {
    const nodes = whiteGraph();
    const start = repertoireToTree('root', nodes).tree;
    // after 1.e4 e5: 2.Nf3 (your move) then 2...Nc6 (opponent)
    const tree = play(start, ['e4', 'e5'], [['g1', 'f3'], ['b8', 'c6']]);
    const nf3 = getNodeAtPath(tree.root, ['e4', 'e5', tree.currentPath[2]]);
    const nc6 = getNodeAtPath(tree.root, tree.currentPath);

    const edits = collectRepertoireEdits(tree, rep('white'), nodes);

    expect(edits.added).toBe(2);
    expect(edits.rejected).toEqual([]);
    expect(edits.patch.e5.childIDs).toEqual([nf3.id]);
    expect(edits.patch[nf3.id]).toMatchObject({ id: nf3.id, repertoireId: 'rep', parentId: 'e5', move: 'Nf3', fen: nf3.fen, childIDs: [nc6.id] });
    expect(edits.patch[nc6.id]).toMatchObject({ parentId: nf3.id, move: 'Nc6', childIDs: [] });
  });

  it('keeps existing children when the parent used chessgraph childIds', () => {
    const nodes = whiteGraph();
    // the opponent's alternative 1...c5 next to the existing 1...e5
    const tree = play(repertoireToTree('root', nodes).tree, ['e4'], [['c7', 'c5']]);
    const edits = collectRepertoireEdits(tree, rep('white'), nodes);
    expect(edits.patch.e4.childIDs).toEqual(['e5', tree.currentPath[1]]);
    expect(edits.patch.e4).not.toHaveProperty('childIds');
  });

  it('refuses a second reply where it is your move (one prepared reply, D17)', () => {
    const nodes = whiteGraph();
    // 1.d4 next to the prepared 1.e4
    const tree = play(repertoireToTree('root', nodes).tree, [], [['d2', 'd4'], ['d7', 'd5']]);
    const edits = collectRepertoireEdits(tree, rep('white'), nodes);
    expect(edits.added).toBe(0);
    expect(edits.patch).toEqual({});
    expect(edits.rejected).toEqual(['1. d4: the repertoire already answers this position with 1. e4']);
  });

  it('allows a reply where it is the opponent to move, even next to existing ones', () => {
    const nodes = whiteGraph();
    const tree = play(repertoireToTree('root', nodes).tree, ['e4'], [['d7', 'd5']]);
    expect(collectRepertoireEdits(tree, rep('white'), nodes).added).toBe(1);
  });

  it('links a move that reaches a position already in the repertoire as a transposition', () => {
    // black repertoire: 1.e4 e6 2.d4 d5, and 1.d4 e6 played on the board, then 2.e4 reaches the same position
    const nodes: Record<string, Node> = {
      root: { id: 'root', repertoireId: 'rep', parentId: null, move: null, fen: DEFAULT_POSITION, childIDs: ['a1', 'b1'] },
      a1: { id: 'a1', repertoireId: 'rep', parentId: 'root', move: 'e4', childIDs: ['a2'] },
      a2: { id: 'a2', repertoireId: 'rep', parentId: 'a1', move: 'e6', childIDs: ['a3'] },
      a3: { id: 'a3', repertoireId: 'rep', parentId: 'a2', move: 'd4', fen: 'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2', childIDs: [] },
      b1: { id: 'b1', repertoireId: 'rep', parentId: 'root', move: 'd4', childIDs: ['b2'] },
      b2: { id: 'b2', repertoireId: 'rep', parentId: 'b1', move: 'e6', childIDs: [] },
    };
    const tree = play(repertoireToTree('root', nodes).tree, ['b1', 'b2'], [['e2', 'e4']]);
    const edits = collectRepertoireEdits(tree, rep('black'), nodes);

    expect(edits.added).toBe(0);
    expect(edits.transpositions).toBe(1);
    expect(edits.patch.b2.transpositionEdges).toEqual([{ targetId: 'a3', move: 'e4' }]);
  });

  it('will not save moves played after a transposition leaf', () => {
    const nodes: Record<string, Node> = {
      root: { id: 'root', repertoireId: 'rep', parentId: null, move: null, fen: DEFAULT_POSITION, childIDs: ['a1'] },
      a1: { id: 'a1', repertoireId: 'rep', parentId: 'root', move: 'e4', childIDs: ['a2'], transpositionEdges: [] },
      a2: { id: 'a2', repertoireId: 'rep', parentId: 'a1', move: 'e5', childIDs: [], transpositionEdges: [{ targetId: 'a1', move: 'Nf3' }] },
    };
    const start = repertoireToTree('root', nodes).tree;
    const leaf = getNodeAtPath(start.root, ['a1', 'a2']).children[0];
    const tree = play(start, ['a1', 'a2', leaf.id], [['b8', 'c6']]);
    const edits = collectRepertoireEdits(tree, rep('white'), nodes);
    expect(edits.added).toBe(0);
    expect(edits.rejected).toEqual(['2... Nc6: continue from the line this transposes to instead']);
  });
});
