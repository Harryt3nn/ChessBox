/*apps/desktop/src/components/board/MoveList.tsx*/

import type { ReactNode } from 'react';
import type { GameTree } from '../../types/gameTree';
import type { MoveNode } from '../../types/moveNode';
import { plyInfo, variationTokens, nagSymbol, type LineToken } from '../../chess/analysisTree';
import styles from './MoveList.module.css';

// Lichess-style move list: the main line in "number | white | black" rows. Wherever the main line
// has alternatives or a comment, the rows break for a full-width block showing them, then carry on.
// Variation text comes from the same tokens as the PGN export, so the two always match.

interface MoveListProps {
  tree: GameTree;
  activeId: string | null;
  onSelect: (path: string[]) => void;
}

type Cell = { node: MoveNode; path: string[] } | null;
type Row = { kind: 'moves'; num: number; white: Cell; black: Cell } | { kind: 'block'; key: string; content: ReactNode };

function moveLabel(node: MoveNode, prefix = '') {
  const nags = (node.nags ?? []).map(nagSymbol).join('');
  return `${prefix ? `${prefix} ` : ''}${node.move}${nags}`;
}

export function MoveList({ tree, activeId, onSelect }: MoveListProps) {
  const rootFen = tree.root.fen;

  const moveSpan = (node: MoveNode, path: string[], label: string, className: string) => (
    <span
      key={node.id}
      className={`${className} ${node.id === activeId ? styles.active : ''}`}
      data-active={node.id === activeId ? 'true' : undefined}
      onClick={() => onSelect(path)}
    >
      {label}
    </span>
  );

  // inline text for one variation: moves, comments and nested brackets
  const renderTokens = (tokens: LineToken[]) =>
    tokens.map((t, i) => {
      if (t.type === 'move') return moveSpan(t.node, t.path, moveLabel(t.node, t.prefix), styles.inlineMove);
      if (t.type === 'comment') return <span key={`c${i}`} className={styles.comment}>{t.text}</span>;
      return t.type === 'open'
        ? <span key={`p${i}`} className={`${styles.paren} ${styles.parenOpen}`}>(</span>
        : <span key={`p${i}`} className={`${styles.paren} ${styles.parenClose}`}>)</span>;
    });

  // ── build rows along the main line ──────────────────────────────────────────
  const rows: Row[] = [];
  let open: Extract<Row, { kind: 'moves' }> | null = null;
  const flush = () => {
    if (open) rows.push(open);
    open = null;
  };

  let node = tree.root;
  let path: string[] = [];
  let ply = 0;

  while (node.children.length > 0) {
    const [main, ...alternatives] = node.children;
    const mainPath = [...path, main.id];
    const { moveNumber, isWhite } = plyInfo(rootFen, ply + 1);

    if (isWhite) {
      flush();
      open = { kind: 'moves', num: moveNumber, white: { node: main, path: mainPath }, black: null };
    } else {
      if (!open) open = { kind: 'moves', num: moveNumber, white: null, black: null };
      open.black = { node: main, path: mainPath };
    }

    const interrupts = !!main.comment || alternatives.length > 0;
    if (interrupts || !isWhite) flush();

    if (main.comment) {
      rows.push({ kind: 'block', key: `c-${main.id}`, content: <span className={styles.comment}>{main.comment}</span> });
    }
    if (alternatives.length > 0) {
      rows.push({
        kind: 'block',
        key: `v-${main.id}`,
        content: alternatives.map(alt => (
          <div key={alt.id} className={styles.variation}>
            {renderTokens(variationTokens(rootFen, alt, path, ply))}
          </div>
        )),
      });
    }

    node = main;
    path = mainPath;
    ply += 1;
  }
  flush();

  if (rows.length === 0) return <span className={styles.empty}>No moves yet</span>;

  return (
    <div className={styles.moveList}>
      {rows.map((row, i) =>
        row.kind === 'block' ? (
          <div key={row.key} className={styles.block}>{row.content}</div>
        ) : (
          <div key={`r${i}`} className={styles.row}>
            <span className={styles.number}>{row.num}.</span>
            {row.white ? moveSpan(row.white.node, row.white.path, moveLabel(row.white.node), styles.move) : <span className={styles.placeholder}>…</span>}
            {row.black
              ? moveSpan(row.black.node, row.black.path, moveLabel(row.black.node), styles.move)
              : i < rows.length - 1 ? <span className={styles.placeholder}>…</span> : <span />}
          </div>
        ),
      )}
    </div>
  );
}
