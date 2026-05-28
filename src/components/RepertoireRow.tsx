import React, { useState, useRef } from "react";
import type { Repertoire } from "../types/Repertoire";

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

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer"
      }}
      onClick={() => onSelect(rep.id)}
    >
      <i className="fa-solid fa-chess-board" style={{ color: "#9a9080", width: 14 }} />

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
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
            padding: "2px 6px",
            color: "#e8e0d5",
            fontSize: 13
          }}
        />
      ) : (
        <span
          style={{ color: "#c0b8b0", fontSize: 14 }}
          onDoubleClick={e => {
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
