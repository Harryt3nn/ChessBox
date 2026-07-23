/*apps/desktop/src/pages/EditRepertoires.tsx*/


import React, { useState, useEffect, useRef } from 'react';
import Analytics from './Analytics';
import Settings from './Settings';
import TrainingToolkit from './TrainingToolkit';
import { FileSystemStorageProvider } from "../Storage/FileSystemStorageProvider";
import { useMemo } from "react";
import FolderSelection from "../components/FolderSelection";
import { validateChessGraphExport } from "../importsAndExports/validateChessGraphExport";
import { ImportModal } from "../components/ImportModal";
import { prepareForImport } from "../importsAndExports/prepareForImport"
import type { Page } from '../types/Page';
import styles from './EditRepertoires.module.css';
import Sidebar from '../components/SidebarModule';



//TODO - Convert functions into components

interface EditRepertoiresProps {
    page: Page;
    setPage: (page: Page) => void;
}

export interface Repertoire {
  id: string;
  name: string;
  side: "white" | "black";
  rootNodeId: string;
  folderId: string | null;
  createdAt: number; 
  updatedAt: number; 
}

export interface Folder {
  id: string;
  name: string;
  sortOrder: number;
  collapsed: boolean;
  createdAt: number; 
  updatedAt: number; 
}


function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function generateId(): string {
  return crypto.randomUUID();
}


function ChessKnightIcon({ color }: { color: "white" | "black" }) {
  const isWhite = color === "white";

  return (
    <div className={`${styles.knightIcon} ${isWhite ? `${styles.knightWhite}` : `${styles.knightBlack}`}`}>
      <i className={`fa-solid fa-chess-queen knight-piece ${isWhite ? `${styles.pieceWhite}` : `${styles.pieceWhite}`}`} />
    </div>
  );
}

function InlineEdit({
  value,
  onSave,
  style,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    if (!cancelledRef.current) {
      onSave(draft.trim() || value);
    }
    cancelledRef.current = false;
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
            cancelledRef.current = true;
            setEditing(false);
          }
        }}
        className={`${styles.inlineEditInput} ${className ?? ""}`}
        style={style}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Double-click to rename"
      className={`${styles.inlineEditText} ${className ?? ""}`}
      style={style}
    >
      {value}
    </span>
  );
}

function RepertoireCard({
  file,
  onRename,
  onSelect,
}: {
  file: Repertoire;
  onRename: (id: string, name: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={styles.redCard}
      onClick={() => onSelect(file.id)}
    >
      <div className={styles.redCardHeader}>
        <ChessKnightIcon color={file.side} />

        <InlineEdit
          value={file.name}
          onSave={(name) => onRename(file.id, name)}
          style={{ flex: 1 }}
          className={styles.redCardTitle}
        />
      </div>

      <div className={styles.repCardFooter}>
        <span>Repertoire</span>
        <span>{timeAgo(file.updatedAt)}</span>
      </div>
    </div>
  );
}


function FolderSection({
  folder,
  files,
  onToggle,
  onRenameFolder,
  onRenameFile,
  onSelectFile,
}: {
  folder: Folder;
  files: Repertoire[];
  onToggle: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onRenameFile: (fileId: string, name: string) => void;
  onSelectFile: (fileId: string) => void;
}) {
  return (
    <div className={styles.folderSelection}>
      {/* Folder header */}
      <div className={styles.folderSelectionHeader}>
        <button
          onClick={() => onToggle(folder.id)}
          className={`${styles.folderChevron} ${folder.collapsed ? "collapsed" : ""}`}
        >
          <i className={`fa-solid fa-chevron-down ${styles.folderChevronIcon}`} />
        </button>

        <i className={`fa-solid fa-folder ${styles.folderIcon}`} />

        <InlineEdit
          value={folder.name}
          onSave={(name) => onRenameFolder(folder.id, name)}
          className={styles.folderSelectionTitle}
        />

        <span className={styles.folderSelectionCount}>{files.length}</span>
      </div>

      {/* Cards grid */}
      {!folder.collapsed && (
        <div className={styles.folderSectionGrid}>
          {files.length === 0 && (
            <div className={styles.folderSectionEmpty}>
              No repertoires in this folder
            </div>
          )}

          {files.map((file) => (
            <RepertoireCard
              key={file.id}
              file={file}
              onRename={(fileId, name) => onRenameFile(fileId, name)}
              onSelect={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}




const EditRepertoires = ({ page, setPage }: EditRepertoiresProps) => {


  const [folders, setFolders] = useState<Folder[]>([]);
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [search, setSearch] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderRef = useRef<HTMLInputElement>(null);
  const storage = useMemo(() => new FileSystemStorageProvider(), []);
  const [pendingImportData, setPendingImportData] = useState<any | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  

  const handleImportClick = async () => {
  const filePaths = await window.storage.openFileDialog({
    filters: [{ name: "JSON Files", extensions: ["json"] }]
  });

  if (!filePaths || filePaths.length === 0) return;

  const filePath = filePaths[0];

  const fileContents = await window.storage.readFile(filePath);
  if (!fileContents) {
    alert("Could not read file.");
    return;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(fileContents);
  } catch {
    alert("File is not valid JSON.");
    return;
  }

  const error = validateChessGraphExport(parsed);
  if (error) {
    alert("Invalid ChessGraph export: " + error);
    return;
  }

  const prepared = prepareForImport(parsed);

  setPendingImportData(prepared);
  setShowImportModal(true);
};


  useEffect(() => {
    if (creatingFolder) newFolderRef.current?.focus();
  }, [creatingFolder]);

  useEffect(() => {
  storage.loadFolders().then(setFolders);
  storage.loadRepertoires().then(setRepertoires);
}, []);


  const toggleFolder = async (id: string) => {
  setFolders(prev => {
    const updated = prev.map(f =>
      f.id === id ? { ...f, collapsed: !f.collapsed, updatedAt: Date.now() } : f
    );
    storage.saveFolders(updated);
    return updated;
  });
};


  const renameFolder = async (id: string, name: string) => {
  setFolders(prev => {
    const updated = prev.map(f =>
      f.id === id ? { ...f, name, updatedAt: Date.now() } : f
    );
    storage.saveFolders(updated);
    return updated;
  });
};

  const renameRepertoire = async (repId: string, name: string) => {
  setRepertoires(prev => {
    const updated = prev.map(r =>
      r.id === repId ? { ...r, name, updatedAt: Date.now() } : r
    );
    const rep = updated.find(r => r.id === repId);
    if (rep) storage.saveRepertoire(rep);
    return updated;
  });
};

  const createFolder = async () => {
  const name = newFolderName.trim() || "New Folder";
  const newFolder = {
    id: generateId(),
    name,
    collapsed: false,
    sortOrder: folders.length,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  setFolders(prev => {
    const updated = [...prev, newFolder];
    storage.saveFolders(updated);
    return updated;
  });

  setNewFolderName("");
  setCreatingFolder(false);
};

  const selectRepertoire = (repId: string) => {
  console.log("Selected repertoire:", repId);
  // later: open viewer/editor
};

const deleteFolder = async (folderId: string) => {
    const updatedFolders = folders.filter(f => f.id !== folderId);
    const updatedRepertoires = repertoires.map(rep =>
      rep.folderId === folderId ? { ...rep, folderId: null } : rep
    );
    await storage.saveFolders(updatedFolders);
    for (const rep of updatedRepertoires) {
      await storage.saveRepertoire(rep);
    }
    setFolders(updatedFolders);
    setRepertoires(updatedRepertoires);
  };

  const UNCATEGORISED_FOLDER: Folder = {
  id: '__uncategorised__',
  name: 'Uncategorised',
  collapsed: false,
  sortOrder: 9999,
  createdAt: 0,
  updatedAt: 0,
};

const reloadData = async () => {
  const loadedFolders = await storage.loadFolders();
  const loadedRepertoires = await storage.loadRepertoires();

  console.log("folders", loadedFolders);
  console.log("repertoires", loadedRepertoires);

  setFolders([
    ...loadedFolders.filter(f => f.id !== '__uncategorised__'),
    UNCATEGORISED_FOLDER,
  ]);
  setRepertoires(loadedRepertoires);
};

 const filtered = folders
  .map(folder => ({
    ...folder,
    filteredRepertoires: repertoires.filter(r =>
      (folder.id === '__uncategorised__' ? r.folderId === null : r.folderId === folder.id) &&
      (search.trim() === '' || r.name.toLowerCase().includes(search.toLowerCase()))
    ),
  }))
  .filter(folder =>
    search.trim() === '' ||
    folder.name.toLowerCase().includes(search.toLowerCase()) ||
    folder.filteredRepertoires.length > 0
  );


  // ── Render ─────────────────────────────────────────────────────────────────
  // TODO - use components
  return (
  <div className="app-layout">
    <Sidebar setPage={setPage} />

    {/* Main */}
    <main className="main-content">
      <div className={styles.topbar}>
        <h1>Your Repertoires</h1>
        <div className={styles.topbarActions}>
          <button className={styles.btnOutline} onClick={() => setCreatingFolder(true)}>
            <i className="fa-solid fa-folder-plus" />
            New Folder
          </button>
          <button className={styles.btnPrimary} onClick={() => {/* TODO */}}>
            <i className="fa-solid fa-plus" />
            New Graph
          </button>
          <button className={styles.btnOutline} onClick={handleImportClick}>
            <i className="fa-solid fa-file-import" />
            Import JSON
          </button>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchContainer}>
        <div className={styles.searchWrapper}>
          <i className="fa-solid fa-magnifying-glass search-icon" />
          <input
            className={styles.searchInput} value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search repertoires..."/>
        </div>
      </div>

      {/* New folder inline input */}
      {creatingFolder && (
        <div className={styles.newFolderContainer}>
          <div className={styles.newFolderInput}>
            <i className="fa-solid fa-folder" />
            <input
              ref={newFolderRef}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              onKeyDown={e => {
                if (e.key === 'Enter') createFolder();
                if (e.key === 'Escape') setCreatingFolder(false);
              }}
              onBlur={createFolder}
            />
          </div>
        </div>
      )}

      {/* Folder list */}
      <div className={styles.folderList}>
        {filtered.length === 0 ? (
    <div className={styles.emptyMessage}>No repertoires found.</div>
        ) : (
      filtered.map(folder => (
      <FolderSelection
        key={folder.id}
        folder={folder}
        repertoires={folder.filteredRepertoires}
        onToggle={toggleFolder}
        onRenameFolder={renameFolder}
        onRenameRepertoire={renameRepertoire}
        onSelectRepertoire={selectRepertoire}
        onDeleteFolder={deleteFolder}/>
        ))
      )}
    </div>
      </main>
        {showImportModal && pendingImportData && (
        <ImportModal data={pendingImportData} onClose={() => 
          setShowImportModal(false)}
          reloadData={reloadData}/>
      )}
    </div>
    );
  };
export default EditRepertoires