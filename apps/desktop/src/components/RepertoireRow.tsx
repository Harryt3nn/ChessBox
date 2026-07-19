/*apps/desktop/src/components/RepertoireRow.tsx */

import React, { useState, useRef } from "react";
import type { Repertoire } from "../types/Repertoire";
import { styleText } from "node:util";
import styles from './repertoireRow.module.css';

// small UI component for individual graphs inside an opened folder
// returns raw html

interface Props {
  rep: Repertoire;
  onRename: (id: string, name: string) => void;
  onSelect: (id: string) => void;
}

const RepertoireRow: React.FC<Props> = ({ rep, onRename, onSelect }) => {
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
    <div className={styles.repRow} onClick={() => onSelect(rep.id)}>

      <i className={`fa-solid fa-chess-board ${styles.repRowIcon}`}/>

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
    </div>
  );
};

export default RepertoireRow;
