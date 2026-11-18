/*apps/desktop/src/pages/EditRepertoires.tsx*/

import { useState, useEffect, useRef, useMemo } from 'react';
import { FileSystemStorageProvider } from "../Storage/FileSystemStorageProvider";
import { validateChessGraphExport } from "../importsAndExports/validateChessGraphExport";
import { ImportModal } from "../components/ImportModal";
import { prepareForImport, type PreparedImportData } from "../importsAndExports/prepareForImport"
import { ImportError } from "../importsAndExports/sanitiseImport";
import type { Repertoire } from '../types/Repertoire'
import type { Folder } from '../types/Folder'
import styles from './EditRepertoires.module.css';
import FolderSelection from "../components/editRepertoireComponents/FolderSelection";
import { UNCATEGORISED_ID, storedFolders, withUncategorised } from "../components/editRepertoireComponents/uncategorised";
import { Icon } from "../components/Icon";
import folderPlusIcon from "../assets/icons/213-folder-3.png";
import folderIcon from "../assets/icons/096-folder-29.png";
import plusGlyph from "../assets/icons/018-plus.png";
import importGlyph from "../assets/icons/015-download.png";
import searchGlyph from "../assets/icons/032-search.png";



function generateId(): string {
  return crypto.randomUUID();
}

const EditRepertoires = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [search, setSearch] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderRef = useRef<HTMLInputElement>(null);
  const storage = useMemo(() => new FileSystemStorageProvider(), []);
  const [pendingImportData, setPendingImportData] = useState<PreparedImportData | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  

  const handleImportClick = async () => {
    const filePaths = await window.storage.openFileDialog({
    filters: [{ name: "JSON Files", extensions: ["json"] }]
  });

  if (!filePaths || filePaths.length === 0) return;

  
  const filePath = filePaths[0];
  let fileContents: string;
  try {fileContents = await window.storage.readFile(filePath);}
  catch (err) {alert(err instanceof Error ? err.message : "Could not read file.");
    return;
  }

  if (!fileContents) {
    alert("Could not read file.");
    return;
  }

  let parsed: unknown;
  try {parsed = JSON.parse(fileContents);}
   catch {alert("File is not in a valid format.");
    return;
  }

  const error = validateChessGraphExport(parsed);
  if (error) {alert("Invalid ChessGraph export: " + error);
    return;
  }

  // sanitising can still reject the file (e.g. nothing usable, or too large) -- never let it crash the page
  let prepared: PreparedImportData;
  try {prepared = prepareForImport(parsed);}
  catch (err) {alert(err instanceof ImportError ? err.message : "This file couldn't be imported.");
    return;
  }

  setPendingImportData(prepared);
  setShowImportModal(true);
};

useEffect(() => {
    if (creatingFolder) newFolderRef.current?.focus();
  }, [creatingFolder]);
  useEffect(() => {
    storage.loadFolders().then(f => setFolders(withUncategorised(f)));
    storage.loadRepertoires().then(setRepertoires);
  }, []);
  
  const toggleFolder = async (id: string) => {
  setFolders(prev => {
    const updated = prev.map(f =>
      f.id === id ? { ...f, collapsed: !f.collapsed, updatedAt: Date.now() } : f
    );
    storage.saveFolders(storedFolders(updated));
    return updated;
  });
};

const renameFolder = async (id: string, name: string) => {
  setFolders(prev => {
    const updated = prev.map(f =>
      f.id === id ? { ...f, name, updatedAt: Date.now() } : f
    );
    storage.saveFolders(storedFolders(updated));
    return updated;
  });
};

const renameRepertoire = async (repId: string, name: string) => {
  setRepertoires(prev => {
    const updated = prev.map(r => r.id === repId ? { ...r, name, updatedAt: Date.now() } : r);
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
    const updated = withUncategorised([...prev, newFolder]);
    storage.saveFolders(storedFolders(updated));
    return updated;
  });
  setNewFolderName("");
  setCreatingFolder(false);
};

const selectRepertoire = (repId: string) => { // later: open viewer/editor
  console.log("Selected repertoire:", repId); 
};

const deleteFolder = async (folderId: string) => {
  const updatedFolders = folders.filter(f => f.id !== folderId);
  const updatedRepertoires = repertoires.map(rep =>
    rep.folderId === folderId ? { ...rep, folderId: null } : rep);
    await storage.saveFolders(storedFolders(updatedFolders));
    for (const rep of updatedRepertoires) {await storage.saveRepertoire(rep);}
    setFolders(updatedFolders);
    setRepertoires(updatedRepertoires);
  };
  const reloadData = async () => {
    const loadedFolders = await storage.loadFolders();
    const loadedRepertoires = await storage.loadRepertoires();
    setFolders(withUncategorised(loadedFolders));
    setRepertoires(loadedRepertoires);
};

const filtered = folders.map(folder => ({...folder, filteredRepertoires: repertoires.filter(r => (
  folder.id === UNCATEGORISED_ID ? r.folderId === null : r.folderId === folder.id) &&(
    search.trim() === '' || r.name.toLowerCase().includes(search.toLowerCase()))),}))
    .filter(folder => search.trim() === '' ||
    folder.name.toLowerCase().includes(search.toLowerCase()) ||
    folder.filteredRepertoires.length > 0);


  // ── Render ─────────────────────────────────────────────────────────────────
return (
  <>
  <main className="main-content">
    <div className={styles.topbar}>
      <h1>Your Repertoires</h1>
      <div className={styles.topbarActions}>
        <button className={styles.btnOutline} onClick={() => setCreatingFolder(true)}>
          <img src={folderPlusIcon} className={styles.btnImg} />
          New Folder
        </button>
        <button className={styles.btnPrimary} onClick={() => {/* TODO */}}>
          <Icon src={plusGlyph} size={14} />
          New Graph
        </button>
        <button className={styles.btnOutline} onClick={handleImportClick}>
          <Icon src={importGlyph} size={14} />
          Import JSON
        </button>
      </div>
    </div>


    {/* Search */}
    <div className={styles.searchContainer}>
      <div className={styles.searchWrapper}>
        <Icon src={searchGlyph} size={14} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search repertoires..."/>
      </div>
    </div>


    {/* New folder inline input */}
    {creatingFolder && (
      <div className={styles.newFolderContainer}>
        <div className={styles.newFolderInput}>
          <img src={folderIcon} className={styles.btnImg} />
          <input
            ref={newFolderRef}
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            onKeyDown={e => {
              if (e.key === "Enter") createFolder();
              if (e.key === "Escape") setCreatingFolder(false);}}
            onBlur={createFolder}/>
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
            onDeleteFolder={deleteFolder}/>)))}
    </div>
  </main>



  {showImportModal && pendingImportData && (
    <ImportModal
      data={pendingImportData}
      onClose={() => setShowImportModal(false)}
      reloadData={reloadData}/>)}
  </>
);
};export default EditRepertoires;