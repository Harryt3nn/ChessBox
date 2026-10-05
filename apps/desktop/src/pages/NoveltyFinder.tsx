/* apps/desktop/src/pages/NoveltyFinder.tsx */

import { useState } from 'react';
import Sidebar from '../components/SidebarModule';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import styles from './NoveltyFinder.module.css';
import shared from './PageShared.module.css';
import type { Page } from '../types/Page';

import noveltyIcon from '../assets/icons/020-chess.png';
import deviationsIcon from '../assets/icons/204-folder-6.png';
import ideaIcon from '../assets/icons/009-idea.png';
import downloadGlyph from '../assets/icons/007-download.png';
import searchGlyph from '../assets/icons/032-search.png';

interface NoveltyFinderProps {
  page: Page;
  setPage: (page: Page) => void;
  currentUser: any; // or your inferred User type
}

const NoveltyFinder = ({ setPage, currentUser }: NoveltyFinderProps) => {
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
        <div className={shared.page}>
          <PageHeader
            icon={noveltyIcon}
            title="Novelty Finder"
            subtitle="Walk your games through your repertoires and catch where they leave your prep."
            actions={
              <button className={shared.btnPrimary} disabled title="Coming soon">
                <Icon src={searchGlyph} size={14} />
                Find Novelties
              </button>
            }
          />

          {/* Game import */}
          <section className={shared.panel}>
            <div className={shared.panelHeader}>
              <h2 className={shared.sectionTitle}>Import Games</h2>
            </div>

            <p className={styles.importHint}>
              Pulls your blitz and rapid games from the accounts linked in Settings.
            </p>

            <div className={styles.importActions}>
              <button
                className={`${styles.importBtn} ${styles.chesscomBtn}`}
                onClick={handleChesscomImport}
                disabled={importing}
              >
                <Icon src={downloadGlyph} size={16} />
                Import Chess.com
              </button>

              <button
                className={`${styles.importBtn} ${styles.lichessBtn}`}
                onClick={handleLichessImport}
                disabled={importing}
              >
                <Icon src={downloadGlyph} size={16} />
                Import Lichess
              </button>
            </div>
          </section>

          <div className={shared.panelGrid}>
            {/* Deviations — game left the repertoire before reaching a leaf */}
            <section className={shared.panel}>
              <div className={shared.panelHeader}>
                <h2 className={shared.sectionTitle}>Deviations</h2>
                <span className={shared.soonBadge}>Coming soon</span>
              </div>

              <div className={shared.emptyState}>
                <img src={deviationsIcon} className={shared.emptyIcon} />
                <span className={shared.emptyTitle}>No deviations found yet</span>
                <span className={shared.emptyHint}>
                  Moves where you or your opponent left a prepared line will be collected
                  here, so you can drill them later.
                </span>
              </div>
            </section>

            {/* Novelties — game followed a line to its end, next move is new */}
            <section className={shared.panel}>
              <div className={shared.panelHeader}>
                <h2 className={shared.sectionTitle}>Novelties</h2>
                <span className={shared.soonBadge}>Coming soon</span>
              </div>

              <div className={shared.emptyState}>
                <img src={ideaIcon} className={shared.emptyIcon} />
                <span className={shared.emptyTitle}>No novelties found yet</span>
                <span className={shared.emptyHint}>
                  When a game follows a repertoire to the end of a line, the next move played
                  is saved here as a candidate to add.
                </span>
              </div>
            </section>
          </div>
        </div>
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