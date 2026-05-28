import React, { useState, useRef } from "react";
import type { Folder } from "../types/Folder";
import type { Repertoire } from "../types/Repertoire";
import RepertoireRow from "./RepertoireRow";

interface FolderSelectionProps {
  folder: Folder;
  repertoires: Repertoire[];
  onToggle: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onRenameRepertoire: (id: string, name: string) => void;
  onSelectRepertoire: (id: string) => void;
  onDeleteFolder: (id: string) => void;
}

const MAX_FOLDER_NAME = 32;

const FolderSelection: React.FC<FolderSelectionProps> = ({
  folder,
  repertoires,
  onToggle,
  onRenameFolder,
  onRenameRepertoire,
  onSelectRepertoire,
  onDeleteFolder
}) => {
  const [editingFolder, setEditingFolder] = useState(false);
  const [folderName, setFolderName] = useState(folder.name);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Folder Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 0"
        }}
      >
        {/* Expand/Collapse */}
        <i
          className={`fa-solid ${folder.collapsed ? "fa-folder" : "fa-folder-open"}`}
          style={{ color: "#c0b8b0", width: 16, cursor: "pointer" }}
          onClick={() => onToggle(folder.id)}
        />

        {/* Folder Name or Input */}
        {editingFolder ? (
          <input
            ref={folderInputRef}
            value={folderName}
            maxLength={MAX_FOLDER_NAME + 5} // allow typing but validate on save
            onChange={e => setFolderName(e.target.value)}
            onBlur={finishFolderRename}
            onKeyDown={e => {
              if (e.key === "Enter") finishFolderRename();
              if (e.key === "Escape") {
                setEditingFolder(false);
                setFolderName(folder.name);
              }
            }}
            style={{
              background: "none",
              border: folderName.length > MAX_FOLDER_NAME
                ? "1px solid #b55"
                : "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              padding: "2px 6px",
              color: "#e8e0d5",
              fontSize: 14
            }}
          />
        ) : (
          <span style={{ color: "#e8e0d5", fontSize: 15 }}>
            {folder.name}
          </span>
        )}

        {/* RENAME BUTTON */}
        {!editingFolder && (
          <button
            onClick={startFolderRename}
            style={{
              background: "none",
              border: "none",
              color: "#c0b8b0",
              cursor: "pointer",
              padding: 4
            }}
            title="Rename folder"
          >
            <i className="fa-solid fa-pen" />
          </button>
        )}

        {/* DELETE BUTTON */}
        <button
          onClick={() => onDeleteFolder(folder.id)}
          style={{
            background: "none",
            border: "none",
            color: "#a86a6a",
            cursor: "pointer",
            padding: 4
          }}
          title="Delete folder"
        >
          <i className="fa-solid fa-trash" />
        </button>
      </div>

      {/* Repertoires */}
      {!folder.collapsed && (
        <div
          style={{
            marginLeft: 26,
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 6
          }}
        >
          {repertoires.length === 0 ? (
            <div style={{ color: "#6e6560", fontSize: 13 }}>No repertoires</div>
          ) : (
            repertoires.map(rep => (
              <RepertoireRow
                key={rep.id}
                rep={rep}
                onRename={onRenameRepertoire}
                onSelect={onSelectRepertoire}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FolderSelection;
