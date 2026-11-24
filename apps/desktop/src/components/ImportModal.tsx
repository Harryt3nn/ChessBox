/*apps/desktop/src/components/ImportModal.tsx*/

import { useMemo, useState } from "react";
import type { PreparedImportData } from "../importsAndExports/prepareForImport";
import type { Repertoire } from "../types/Repertoire";
import { findReplyConflicts, keepReplies } from "../importsAndExports/replyConflicts";
import toast from "react-hot-toast";
import styles from "./ImportModal.module.css";

// pick which repertoires of a chessgraph file to import. Where a picked repertoire has more than one
// reply on its own move, the user keeps one (D17); the other branches aren't imported.

interface ImportModalProps {
  data: PreparedImportData;
  onClose: () => void;
  reloadData: () => Promise<void>;
}

export function ImportModal({ data, onClose, reloadData }: ImportModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const chosenReps = data.repertoires.filter(r => selected.includes(r.id));
  // recomputed when the selection changes; chosenReps is derived from it
  const conflicts = useMemo(() => findReplyConflicts(chosenReps, data.nodes), [data.nodes, selected]);

  const toggle = (id: string) => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleImport = async () => {
    setLoading(true);
    // a position the user didn't touch keeps its first reply, the main line
    const kept = Object.fromEntries(conflicts.map(c => [c.nodeId, choices[c.nodeId] ?? c.replies[0].id]));
    try {
      await window.storage.importRepertoires({
        folders: data.folders,
        repertoires: chosenReps,
        nodes: keepReplies(data.nodes, chosenReps, kept),
      });
      await reloadData();
      toast.success("Imported repertoires successfully");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const groups: { name: string; reps: Repertoire[] }[] = [
    ...data.folders.map(f => ({ name: f.name, reps: data.repertoires.filter(r => r.folderId === f.id) })),
    { name: "No folder", reps: data.repertoires.filter(r => r.folderId === null) },
  ].filter(g => g.reps.length > 0);

  return (
    <div className={styles.backdrop}>
      <div className={styles.window}>
        <h2 className={styles.title}>Import from chessgraph</h2>
        <p className={styles.hint}>Choose the repertoires to import. Their folders come with them.</p>

        {/* anything the sanitiser dropped or repaired while reading the file */}
        {data.warnings.length > 0 && (
          <ul className={styles.warnings}>
            {data.warnings.map(w => <li key={w}>{w}</li>)}
          </ul>
        )}

        <div className={styles.list}>
          {groups.map(group => (
            <div key={group.name} className={styles.group}>
              <div className={styles.groupName}>{group.name}</div>
              {group.reps.map(rep => (
                <label key={rep.id} className={styles.rep}>
                  <input type="checkbox" checked={selected.includes(rep.id)} onChange={() => toggle(rep.id)} />
                  {rep.name}
                  <span className={styles.side}>{rep.side}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        {conflicts.length > 0 && (
          <div className={styles.conflicts}>
            <div className={styles.groupName}>One reply per position</div>
            <p className={styles.hint}>
              These positions have more than one reply on your own move. Keep one; the other lines won't be imported.
            </p>
            {conflicts.map(c => (
              <div key={`${c.repertoireId}:${c.nodeId}`} className={styles.conflict}>
                <span className={styles.conflictLine}>{c.repertoireName}: {c.line}</span>
                <div className={styles.replies}>
                  {c.replies.map(r => (
                    <label key={r.id} className={styles.reply}>
                      <input
                        type="radio"
                        name={c.nodeId}
                        checked={(choices[c.nodeId] ?? c.replies[0].id) === r.id}
                        onChange={() => setChoices(prev => ({ ...prev, [c.nodeId]: r.id }))}
                      />
                      {r.move}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.btnOutline} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={selected.length === 0 || loading} onClick={handleImport}>
            {loading ? "Importing…" : "Import selected"}
          </button>
        </div>
      </div>
    </div>
  );
}
