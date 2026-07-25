/* apps/desktop/src/pages/NoveltyFinder.tsx */

import { useState } from 'react';
import Sidebar from '../components/SidebarModule';
import styles from './NoveltyFinder.module.css';
import type { Page } from '../types/Page';

interface NoveltyFinderProps {
  page: Page;
  setPage: (page: Page) => void;
  currentUser: any; // or your inferred User type
}

const NoveltyFinder = ({ page, setPage, currentUser }: NoveltyFinderProps) => {
  const [importing, setImporting] = useState(false);
  const [importingFrom, setImportingFrom] = useState<"lichess" | "chesscom" | null>(null);

  async function handleLichessImport() {
    if (!currentUser) {
      alert("You are not logged in.");
      return;
    }

    if (!currentUser.lichessName) {
      alert("You haven't linked your Lichess account yet. Go to Settings.");
      return;
    }

    setImporting(true);
    setImportingFrom("lichess");
    try {
      const res = await window.api.importLichess(currentUser.lichessName);

      if (res.ok) {
        alert("Lichess games imported!");
      } else {
        alert("Import failed: " + res.error);
      }
    } finally {
      setImporting(false);
      setImportingFrom(null);
    }
  }

  async function handleChesscomImport() {
    if (!currentUser) {
      alert("You are not logged in.");
      return;
    }

    if (!currentUser.chesscomName) {
      alert("You haven't linked your Chess.com account yet. Go to Settings.");
      return;
    }

    setImporting(true);
    setImportingFrom("chesscom");
    try {
      const res = await window.api.importChesscom(currentUser.chesscomName);

      if (res.ok) {
        alert("Chess.com games imported!");
      } else {
        alert("Import failed: " + res.error);
      }
    } finally {
      setImporting(false);
      setImportingFrom(null);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>Novelty Finder coming soon...</h1>
        <button onClick={handleLichessImport}>Import Lichess</button>
        <button onClick={handleChesscomImport}>Import Chess.com</button>
      </main>

      {importing && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalWindow}>
            <h2>Importing Games</h2>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>
              Pulling your games from {importingFrom === "chesscom" ? "Chess.com" : "Lichess"}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoveltyFinder;