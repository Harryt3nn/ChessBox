/*apps/desktop/src/components/editRepertoireComponents/FolderSelection.tsx */

import React, { useState, useRef } from "react";
import type { Folder } from "../../types/Folder";
import type { Repertoire } from "../../types/Repertoire";
import RepertoireRow from "../RepertoireRow";
import styles from "./FolderSection.module.css";
import { UNCATEGORISED_ID } from "./uncategorised";

// UI component to display available 'folders' (JSON objects)
// ensures folders can collapse
// functions: collapse, rename (rep + folder), select, delete
// returns raw html


// predefine all operations
interface FolderSelectionProps {
  folder: Folder;
  repertoires: Repertoire[];
  onToggle: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onRenameRepertoire: (id: string, name: string) => void;
  onOpenRepertoire: (rep: Repertoire) => void;
  onBuildRepertoire: (rep: Repertoire) => void;
  onDeleteFolder: (id: string) => void;
}

// folder names cannot be too long (for optimal display)
const MAX_FOLDER_NAME = 32;

const FolderSelection: React.FC<FolderSelectionProps> = ({folder, repertoires, onToggle, onRenameFolder, 
  onRenameRepertoire, onOpenRepertoire, onBuildRepertoire, onDeleteFolder
}) => { const [editingFolder, setEditingFolder] = useState(false);
  const [folderName, setFolderName] = useState(folder.name); 
  const folderInputRef = useRef<HTMLInputElement>(null);
  const permanent = folder.id === UNCATEGORISED_ID;

  // name cannot be empty
  const startFolderRename = () => {
    setEditingFolder(true);
    setTimeout(() => folderInputRef.current?.focus(), 0);
  };

  const finishFolderRename = () => {
    const trimmed = folderName.trim();

    setEditingFolder(false);
    if (!trimmed || trimmed === folder.name) {
      setFolderName(folder.name);
      return;
    }
    if (trimmed.length > MAX_FOLDER_NAME) {
      alert(`Folder names must be under ${MAX_FOLDER_NAME} characters.`);
      setFolderName(folder.name);
      return;
    }

    onRenameFolder(folder.id, trimmed);
  };

  // render:
  return (
    <div className={styles.folderSection}>
      {/* Folder Header */}
      <div className={styles.folderHeader}>
        {/* Expand/Collapse */}
        <button
          type="button"
          className={styles.folderToggle}
          onClick={() => onToggle(folder.id)}
          aria-expanded={!folder.collapsed}
          aria-label={`${folder.collapsed ? 'Show' : 'Hide'} folder ${folder.name}`}
        >
          {folder.collapsed ? 'Show' : 'Hide'}
        </button>

        {/* Folder Name or Input */}
        {editingFolder ? (
          <input
            aria-label="Folder name"
            ref={folderInputRef}
            value={folderName}
            maxLength={MAX_FOLDER_NAME + 5}
            onChange={e => setFolderName(e.target.value)}
            onBlur={finishFolderRename}
            onKeyDown={e => {
              if (e.key === "Enter") finishFolderRename();
              if (e.key === "Escape") {
                setEditingFolder(false);
                setFolderName(folder.name);
              }
            }}
            className={`${styles.folderInput} ${folderName.length > MAX_FOLDER_NAME ? 
              `${styles.folderInputError}` : ""}`}/>) : (
          <span className={styles.folderName}>{folder.name}</span>
        )}

        {/* RENAME BUTTON */}
        {!editingFolder && !permanent && (
          <button
            onClick={startFolderRename}
            className={`${styles.folderBtn} ${styles.folderBtnRename}`}
            title="Rename folder"
          >
            Rename
          </button>
        )}

        {/* DELETE BUTTON */}
        {!permanent && (
          <button
            onClick={() => onDeleteFolder(folder.id)}
            className={`${styles.folderBtn} ${styles.folderBtnDelete}`}
            title="Delete folder"
          >
            Delete
          </button>
        )}
      </div>

      {/* Repertoires */}
      {!folder.collapsed && (
        <div className={styles.repertoireList}>
          {repertoires.length === 0 ? (
            <div className={styles.repertoireEmpty}>No repertoires</div>
          ) : (
            repertoires.map(rep => (
              <RepertoireRow
                key={rep.id}
                rep={rep}
                onRename={onRenameRepertoire}
                onOpen={onOpenRepertoire}
                onBuild={onBuildRepertoire}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FolderSelection;