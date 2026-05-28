import React, { useState, useEffect, useRef } from 'react';
import Analytics from './Analytics';
import Settings from './Settings';
import TrainingToolkit from './TrainingToolkit';
import { FileSystemStorageProvider } from "../Storage/FileSystemStorageProvider";
import { useMemo } from "react";
import FolderSelection from "../components/FolderSelection";




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

type Page = 'home' | 'analytics' | 'tools' | 'settings';

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
  const isWhite = color === 'white';
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 6,
      background: isWhite ? 'rgba(240,217,181,0.15)' : 'rgba(100,80,60,0.25)',
      border: `1px solid ${isWhite ? 'rgba(240,217,181,0.3)' : 'rgba(150,120,90,0.3)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <i className="fa-solid fa-chess-queen" style={{
        fontSize: 14,
        color: isWhite ? '#f0d9b5' : '#b58863',
      }} />
    </div>
  );
}

function InlineEdit({
  value,
  onSave,
  style,
}: {
  value: string;
  onSave: (v: string) => void;
  style?: React.CSSProperties;
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
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(240,217,181,0.4)",
          borderRadius: 4,
          color: "#e8e0d5",
          padding: "2px 6px",
          fontSize: "inherit",
          fontFamily: "inherit",
          fontWeight: "inherit",
          outline: "none",
          ...style,
        }}
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
      style={{ cursor: "text", ...style }}
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
      onClick={() => onSelect(file.id)}
      style={{
        background: "#2a2725",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s, transform 0.1s",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 110,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(240,217,181,0.3)";
        e.currentTarget.style.background = "#302e2c";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        e.currentTarget.style.background = "#2a2725";
        e.currentTarget.style.transform = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ChessKnightIcon color={file.side} />

        <InlineEdit
          value={file.name}
          onSave={(name) => onRename(file.id, name)}
          style={{
            fontWeight: 600,
            fontSize: 15,
            color: "#e8e0d5",
            flex: 1,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "auto",
          fontSize: 12,
          color: "#6e6560",
        }}
      >
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
    <div style={{ marginBottom: 28 }}>
      {/* Folder header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          color: "#9a9080",
        }}
      >
        <button
          onClick={() => onToggle(folder.id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9a9080",
            padding: 0,
            display: "flex",
            alignItems: "center",
            transition: "transform 0.2s",
            transform: folder.collapsed ? "rotate(-90deg)" : "rotate(0deg)",
          }}
        >
          <i className="fa-solid fa-chevron-down" style={{ fontSize: 11 }} />
        </button>

        <i className="fa-solid fa-folder" style={{ fontSize: 13 }} />

        <InlineEdit
          value={folder.name}
          onSave={(name) => onRenameFolder(folder.id, name)}
          style={{ fontWeight: 600, fontSize: 14, color: "#c0b8b0" }}
        />

        <span style={{ fontSize: 12, marginLeft: 2, color: "#6e6560" }}>
          {files.length}
        </span>
      </div>

      {/* Cards grid */}
      {!folder.collapsed && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {files.length === 0 && (
            <div
              style={{
                color: "#6e6560",
                fontSize: 13,
                padding: "8px 4px",
              }}
            >
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



const EditRepertoires = ({ onBack }: { onBack: () => void }) => {
  const [page, setPage] = useState<Page>("home");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [search, setSearch] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderRef = useRef<HTMLInputElement>(null);
  const storage = useMemo(() => new FileSystemStorageProvider(), []);

  useEffect(() => {
    if (creatingFolder) newFolderRef.current?.focus();
  }, [creatingFolder]);

  useEffect(() => {
  storage.loadFolders().then(setFolders);
  storage.loadRepertoires().then(setRepertoires);
}, []);

  if (page === 'analytics') return <Analytics onBack={() => setPage('home')} />;
  if (page === 'tools') return <TrainingToolkit onBack={() => setPage('home')} />;
  if (page === 'settings') return <Settings onBack={onBack} />;

  
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

 const filtered = search.trim()
  ? folders
      .map(folder => {
        const repsInFolder = repertoires.filter(
          r =>
            r.folderId === folder.id &&
            r.name.toLowerCase().includes(search.toLowerCase())
        );

        const folderMatches = folder.name
          .toLowerCase()
          .includes(search.toLowerCase());

        return {
          ...folder,
          collapsed: false,
          filteredRepertoires: repsInFolder,
          folderMatches
        };
      })
      .filter(f => f.folderMatches || f.filteredRepertoires.length > 0)
  : folders.map(folder => ({
      ...folder,
      filteredRepertoires: repertoires.filter(r => r.folderId === folder.id)
    }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app-layout" style={{ display: 'flex', height: '100vh', background: '#1a1a1a', overflow: 'hidden' }}>

      {/* Sidebar */}
      <aside className="sidebar" style={{
        width: 220, background: '#262522', display: 'flex',
        flexDirection: 'column', padding: '20px 0', flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="sidebar-logo" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 12,
        }}>
          <i className="fa-solid fa-chess-knight" style={{ color: '#f0d9b5', fontSize: 20 }} />
          <span style={{ fontWeight: 700, fontSize: 16, color: '#e8e0d5' }}>CTT</span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
          {[
            { label: 'Repertoires', icon: 'fa-book-open', active: true, onClick: () => {} },
            { label: 'Analytics', icon: 'fa-chart-line', active: false, onClick: () => setPage('analytics') },
            { label: 'Training', icon: 'fa-dumbbell', active: false, onClick: () => setPage('tools') },
          ].map(({ label, icon, active, onClick }) => (
            <button key={label} onClick={onClick} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: active ? 'rgba(240,217,181,0.1)' : 'transparent',
              color: active ? '#f0d9b5' : '#9a9080',
              fontSize: 13, fontWeight: active ? 600 : 400,
              transition: 'background 0.15s, color 0.15s',
              textAlign: 'left', width: '100%',
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <i className={`fa-solid ${icon}`} style={{ width: 16, textAlign: 'center' }} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px 10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: 'Home', icon: 'fa-house', onClick: onBack },
            { label: 'Settings', icon: 'fa-gear', onClick: () => setPage('settings') },
          ].map(({ label, icon, onClick }) => (
            <button key={label} onClick={onClick} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: 'transparent', color: '#9a9080',
              fontSize: 13, width: '100%', textAlign: 'left',
              transition: 'background 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#c0b8b0'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9a9080'; }}
            >
              <i className={`fa-solid ${icon}`} style={{ width: 16, textAlign: 'center' }} />
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '28px 36px 20px', flexShrink: 0,
        }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#e8e0d5' }}>
            Your Repertoires
          </h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setCreatingFolder(true)}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: '#c0b8b0',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(240,217,181,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = '#f0d9b5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#c0b8b0'; }}
            >
              <i className="fa-solid fa-folder-plus" style={{ fontSize: 12 }} />
              New Folder
            </button>
            <button
              onClick={() => {/* add file later */}}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: 'none', background: '#5b8dd9', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#4a7bc8'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#5b8dd9'; }}
            >
              <i className="fa-solid fa-plus" style={{ fontSize: 12 }} />
              New Graph
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 36px 20px', flexShrink: 0 }}>
          <div style={{ position: 'relative', maxWidth: 600 }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: '#6e6560', fontSize: 13, pointerEvents: 'none',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search repertoires..."
              style={{
                width: '100%', padding: '10px 14px 10px 38px',
                background: '#2a2725', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, color: '#e8e0d5', fontSize: 13,
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(240,217,181,0.3)'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
            />
          </div>
        </div>

        {/* New folder inline input */}
        {creatingFolder && (
          <div style={{ padding: '0 36px 20px', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#2a2725', border: '1px solid rgba(240,217,181,0.3)',
              borderRadius: 8, padding: '10px 14px', maxWidth: 360,
            }}>
              <i className="fa-solid fa-folder" style={{ color: '#9a9080', fontSize: 13 }} />
              <input
                ref={newFolderRef}
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setCreatingFolder(false); }}
                onBlur={createFolder}
                style={{
                  flex: 1, background: 'none', border: 'none',
                  color: '#e8e0d5', fontSize: 13, outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* Folder list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 36px 36px' }}>
          {filtered.length === 0 ? (
            <div style={{ color: '#6e6560', fontSize: 14, marginTop: 40, textAlign: 'center' }}>
              No repertoires found.
            </div>
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
               onDeleteFolder={deleteFolder}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default EditRepertoires;