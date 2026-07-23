/*apps/desktop/src/components/editRepertoireComponents/InlineEdit.tsx*/

import React, { useState, useEffect, useRef } from "react";
import styles from "./InlineEdit.module.css";

export function InlineEdit({
  value,
  onSave,
  className,
  style
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const commit = () => {
    if (!cancelled.current) {
      onSave(draft.trim() || value);
    }
    cancelled.current = false;
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            cancelled.current = true;
            setEditing(false);
          }
        }}
        className={`${styles.input} ${className ?? ""}`}
        style={style}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className={`${styles.text} ${className ?? ""}`}
      style={style}
      title="Double-click to rename"
    >
      {value}
    </span>
  );
}