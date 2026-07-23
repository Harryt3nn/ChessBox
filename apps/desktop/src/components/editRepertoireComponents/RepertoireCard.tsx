/*apps/desktop/src/components/editRepertoireComponents/RepertoireCard.tsx*/

import { InlineEdit } from "./InlineEdit";
import { ChessKnightIcon } from "./ChessKnightIcon";
import styles from "./RepertoireCard.module.css";
import type { Repertoire } from "../../pages/EditRepertoires";


function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function RepertoireCard({
  file,
  onRename,
  onSelect
}: {
  file: Repertoire;
  onRename: (id: string, name: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.card} onClick={() => onSelect(file.id)}>
      <div className={styles.header}>
        <ChessKnightIcon color={file.side} />

        <InlineEdit
          value={file.name}
          onSave={(name) => onRename(file.id, name)}
          className={styles.title}
          style={{ flex: 1 }}
        />
      </div>

      <div className={styles.footer}>
        <span>Repertoire</span>
        <span>{timeAgo(file.updatedAt)}</span>
      </div>
    </div>
  );
}
