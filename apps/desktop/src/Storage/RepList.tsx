/*apps/desktop/src/storage/RepList.tsx*/


import type { Folder } from "../types/Folder";
import type { Repertoire } from "../types/Repertoire";
import styles from "./repList.module.css";

interface RepListProps {
  folders: Folder[];
  repertoires: Repertoire[];
}

export function RepList({ folders, repertoires }: RepListProps) {
  return (
    <div className="rep-list">
      {folders.map(folder => {
        const repsInFolder = repertoires.filter(r => r.folderId === folder.id);

        return (
          <div key={folder.id} className={styles.folderRow}>
            <div className={styles.folderHeader}>
              <span className={styles.folderName}>{folder.name}</span>
            </div>

            <div className={styles.folderReps}>
              {repsInFolder.length === 0 ? (
                <div className={styles.empty}>No repertoires</div>
              ) : (
                repsInFolder.map(rep => (
                  <div key={rep.id} className={styles.repPreview}>
                    • {rep.name} ({rep.side})
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}