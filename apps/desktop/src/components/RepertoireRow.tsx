/*apps/desktop/src/components/RepertoireRow.tsx */

import React, { useState, useRef } from "react";
import type { Repertoire } from "../types/Repertoire";
import styles from './repertoireRow.module.css';
import boardIcon from '../assets/icons/021-chess board.png';

// small UI component for individual graphs inside an opened folder
// returns raw html

interface Props {
  rep: Repertoire;
  onRename: (id: string, name: string) => void;
  onOpen: (rep: Repertoire) => void;
  onBuild: (rep: Repertoire) => void;
}

const RepertoireRow: React.FC<Props> = ({ rep, onRename, onOpen, onBuild }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(rep.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = () => {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== rep.name) onRename(rep.id, trimmed);
    else setName(rep.name);
  };

  //render
  return (
    <div className={styles.repRow}>

      <img src={boardIcon} className={styles.repRowIcon} />

      {editing ? (
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={finish}
          onKeyDown={e => {
            if (e.key === "Enter") finish();
            if (e.key === "Escape") {
              setEditing(false);
              setName(rep.name);
            }
          }}
          className={styles.repRowInput}
        />
      ) : (
        <span
          className={styles.repRowName} onDoubleClick= {e => {
            e.stopPropagation();
            setEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          {rep.name}
        </span>
      )}

      <button className={styles.openButton} onClick={() => onBuild(rep)} title="Edit this repertoire as a graph">
        Builder
      </button>
      <button className={styles.openButton} onClick={() => onOpen(rep)} title="Open this repertoire in the analysis board">
        Open in board
      </button>
    </div>
  );
};

export default RepertoireRow;
