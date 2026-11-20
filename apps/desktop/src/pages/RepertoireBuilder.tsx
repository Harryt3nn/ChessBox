/* apps/desktop/src/pages/RepertoireBuilder.tsx */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Background, Controls, Handle, Position, ReactFlow, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import type { Node } from '../types/Node';
import type { Repertoire } from '../types/Repertoire';
import { FileSystemStorageProvider } from '../Storage/FileSystemStorageProvider';
import { deleteBranch, layoutRepertoire, NODE_HEIGHT, NODE_WIDTH, type BuilderNode } from '../builder/graph';
import { childrenOf, repertoireToTree } from '../chess/repertoireTree';
import { isPromotionMove, pathToNode, playMove } from '../chess/analysisTree';
import { collectRepertoireEdits, normalised } from '../chess/repertoireEdits';
import styles from './RepertoireBuilder.module.css';
import type { BoardFocus } from './BoardView';

// the visual repertoire builder (M5, D20): the graph top-down, a mini board to add moves from the
// selected position (same rules as the analysis board: one reply on your move, transpositions linked)

interface RepertoireBuilderProps {
  repertoire: Repertoire;
  focusNodeId: string | null; // the position to select and centre on when it opens
  onOpenInBoard: (repertoire: Repertoire, focus: BoardFocus) => void;
  onBack: () => void;
}

type PositionData = BuilderNode['data'] & { onToggle: (id: string) => void };

// one box per position: its move, a dot when it has a comment, and a toggle to fold the moves after it
function PositionNode({ id, data, selected }: NodeProps) {
  const d = data as PositionData;
  const folded = d.hidden !== undefined;
  return (
    <div className={`${styles.node} ${selected ? styles.nodeSelected : ''}`} style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      {d.label}
      {d.comment && <span className={styles.commentDot} title={d.comment} />}
      {d.children > 0 && (
        <button
          className={`nodrag nopan ${styles.toggle} ${folded ? styles.toggleFolded : ''}`}
          title={folded ? 'Show the moves after this' : 'Hide the moves after this'}
          onClick={e => { e.stopPropagation(); d.onToggle(id); }}
        >
          {folded ? `+${d.hidden}` : '−'}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

const nodeTypes = { position: PositionNode };

const RepertoireBuilder = ({ repertoire, focusNodeId, onOpenInBoard, onBack }: RepertoireBuilderProps) => {
  const storage = useMemo(() => new FileSystemStorageProvider(), []);
  const [nodes, setNodes] = useState<Record<string, Node> | null>(null);
  const [selectedId, setSelectedId] = useState(focusNodeId ?? repertoire.rootNodeId);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  // click-to-move on the mini board, like the analysis board: first click picks the piece
  const [from, setFrom] = useState<Square | null>(null);
  // a click-move that needs its promotion piece picked first
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  // folded positions: view state only, so big repertoires stay readable; not saved
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  // bumped by collapse / expand all to remount the canvas, since React Flow only fits the view on mount
  const [viewKey, setViewKey] = useState(0);

  const toggle = useCallback((id: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  }), []);

  const reload = useCallback(async () => setNodes(await storage.loadNodes()), [storage]);
  useEffect(() => { void reload(); }, [reload]);

  const graph = useMemo(() => {
    if (!nodes) return null;
    try {
      return layoutRepertoire(repertoire.rootNodeId, nodes, collapsed);
    } catch {
      return null;
    }
  }, [nodes, repertoire.rootNodeId, collapsed]);

  // shown plus folded away, so the count doesn't shrink when branches fold
  const positions = (graph?.nodes ?? []).reduce((sum, n) => sum + 1 + (n.data.hidden ?? 0), 0);

  const selected = graph?.nodes.find(n => n.id === selectedId) ?? graph?.nodes[0];
  useEffect(() => {
    setComment(nodes?.[selected?.id ?? '']?.comment ?? '');
    setFrom(null);
    setPendingPromotion(null);
  }, [selected?.id, nodes]);

  const flowNodes = useMemo(
    () => (graph?.nodes ?? []).map(n => ({ ...n, type: 'position', selected: n.id === selected?.id, data: { ...n.data, onToggle: toggle } })),
    [graph, selected?.id, toggle],
  );
  const flowEdges = useMemo(
    () => (graph?.edges ?? []).map(e => ({ ...e, className: e.data.transposition ? styles.transposition : styles.edge })),
    [graph],
  );

  // a piece dropped on the mini board adds that move from the selected position
  async function addMove(from: Square, to: Square, promotion?: string): Promise<boolean> {
    if (!nodes || !selected) return false;
    const { tree } = repertoireToTree(repertoire.rootNodeId, nodes);
    const path = pathToNode(tree.root, selected.id);
    const next = path && playMove({ ...tree, currentPath: path }, { from, to, promotion });
    if (!next) return false;

    const edits = collectRepertoireEdits(next, repertoire, nodes);
    if (edits.rejected.length) {
      setMessage(`Not added: ${edits.rejected[0]}.`);
      return false;
    }
    if (!edits.added && !edits.transpositions) {
      setMessage('That move is already in the repertoire.');
      return false;
    }
    await storage.saveNodes(edits.patch);
    // the new move goes under the selected position: unfold it, or the move lands out of sight
    setCollapsed(prev => {
      const next = new Set(prev);
      next.delete(selected.id);
      return next;
    });
    await reload();
    setSelectedId(next.currentPath[next.currentPath.length - 1]);
    setMessage(edits.transpositions ? 'Linked as a transposition to the position the repertoire already has.' : null);
    return true;
  }

  // called with the chosen piece (e.g. "wN"), or with nothing if the picker was closed
  function onPromotionPieceSelect(piece?: string, dropFrom?: Square, dropTo?: Square): boolean {
    const move = dropFrom && dropTo ? { from: dropFrom, to: dropTo } : pendingPromotion;
    setPendingPromotion(null);
    if (piece && move) void addMove(move.from, move.to, piece[1].toLowerCase());
    return false;
  }

  // fold where the lines first split: folding the first move of a one-opening repertoire would hide everything
  function collapseAll() {
    const root = nodes?.[repertoire.rootNodeId];
    if (!nodes || !root) return;
    const seen = new Set<string>();
    let kids = childrenOf(root);
    while (kids.length === 1 && nodes[kids[0]] && !seen.has(kids[0])) {
      seen.add(kids[0]);
      kids = childrenOf(nodes[kids[0]]);
    }
    setCollapsed(new Set(kids));
    setViewKey(k => k + 1);
  }

  function expandAll() {
    setCollapsed(new Set());
    setViewKey(k => k + 1);
  }

  async function saveComment() {
    if (!nodes || !selected) return;
    const node = { ...normalised(nodes[selected.id]) };
    if (comment.trim()) node.comment = comment.trim();
    else delete node.comment;
    await storage.saveNodes({ [node.id]: node });
    await reload();
    setMessage('Comment saved.');
  }

  async function removeBranch() {
    if (!nodes || !selected || !window.confirm(`Delete ${selected.data.label} and every move after it?`)) return;
    const { patch, removed } = deleteBranch(nodes, repertoire.rootNodeId, selected.id);
    await storage.saveNodes(patch, removed);
    setSelectedId(nodes[selected.id].parentId ?? repertoire.rootNodeId);
    await reload();
    setMessage(`Deleted ${removed.length} position${removed.length === 1 ? '' : 's'}.`);
  }

  async function removeRepertoire() {
    if (!window.confirm(`Delete the repertoire "${repertoire.name}" and all its moves? This can't be undone.`)) return;
    await storage.deleteRepertoire(repertoire.id);
    onBack();
  }

  return (
    <main className={styles.builder}>
      <header className={styles.header}>
        <button className={styles.btn} onClick={onBack}>← Repertoires</button>
        <h1 className={styles.title}>{repertoire.name}</h1>
        <span className={styles.meta}>plays {repertoire.side} · {positions} positions</span>
        <div className={styles.headerActions}>
          <button className={styles.btn} onClick={collapseAll}>Collapse all</button>
          <button className={styles.btn} onClick={expandAll} disabled={!collapsed.size}>Expand all</button>
          <button className={styles.btn} onClick={() => onOpenInBoard(repertoire, { nodeId: selected?.id ?? repertoire.rootNodeId })} title="Open the selected position in the analysis board">Open in board</button>
          <button className={`${styles.btn} ${styles.danger}`} onClick={removeRepertoire}>Delete repertoire</button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.canvas}>
          {graph ? (
            <ReactFlow
              key={viewKey}
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              onNodeClick={(_e, n) => { setSelectedId(n.id); setMessage(null); }}
              nodesDraggable={false}
              nodesConnectable={false}
              fitView
              // opened on a position: centre on it, but only the first time (collapse / expand all re-fits the whole tree)
              fitViewOptions={viewKey === 0 && focusNodeId ? { nodes: [{ id: focusNodeId }], maxZoom: 1 } : undefined}
              minZoom={0.05}
              proOptions={{ hideAttribution: true }}
            >
              <Background />
              <Controls showInteractive={false} />
            </ReactFlow>
          ) : (
            <p className={styles.empty}>{nodes ? "This repertoire's starting position is missing." : 'Loading…'}</p>
          )}
        </div>

        {selected && (
          <aside className={styles.panel}>
            <span className={styles.panelTitle}>{selected.data.label}</span>
            <Chessboard
              position={selected.data.fen}
              boardOrientation={repertoire.side}
              boardWidth={272}
              onPieceDrop={(source, target) => { void addMove(source as Square, target as Square); return false; }}
              onPromotionCheck={(source, target) => isPromotionMove(selected.data.fen, source, target)}
              onPromotionPieceSelect={onPromotionPieceSelect}
              showPromotionDialog={pendingPromotion !== null}
              promotionToSquare={pendingPromotion?.to ?? null}
              onSquareClick={square => {
                const to = square as Square;
                if (from && from !== to && isPromotionMove(selected.data.fen, from, to)) setPendingPromotion({ from, to });
                else if (from && from !== to) void addMove(from, to);
                setFrom(from ? null : to);
              }}
              customSquareStyles={from ? { [from]: { backgroundColor: 'var(--highlight-selected)' } } : {}}
            />
            <span className={styles.hint}>Drag a piece, or click it and then its square, to add a move from this position.</span>

            <textarea
              className={styles.comment}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Comment on this position"
            />
            <div className={styles.panelActions}>
              <button className={styles.btn} onClick={saveComment}>Save comment</button>
              {selected.id !== repertoire.rootNodeId && (
                <button className={`${styles.btn} ${styles.danger}`} onClick={removeBranch}>Delete branch</button>
              )}
            </div>
            {message && <p className={styles.message}>{message}</p>}
          </aside>
        )}
      </div>
    </main>
  );
};

export default RepertoireBuilder;
