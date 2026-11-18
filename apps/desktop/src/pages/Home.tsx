/* apps/desktop/src/pages/Home.tsx */

import { useEffect, useMemo, useState } from 'react';
import shared from './PageShared.module.css';
import styles from './Home.module.css';
import type { Page } from '../types/Page';
import type { Repertoire } from '../types/Repertoire';
import type { Folder } from '../types/Folder';
import { FileSystemStorageProvider } from '../Storage/FileSystemStorageProvider';

import boardIcon from '../assets/icons/021-chess board.png';
import repertoiresIcon from '../assets/icons/015-chess.png';
import toolsIcon from '../assets/icons/007-king.png';
import noveltyIcon from '../assets/icons/020-chess.png';
import weakPointsIcon from '../assets/icons/041-checkmate.png';
import analyticsIcon from '../assets/icons/029-strategy.png';
import settingsIcon from '../assets/icons/003-chess.png';

// the hub: every section is a tile, filled with whatever real data it already has

interface HomeUser {
  username: string;
  lichessName: string | null;
  chesscomName: string | null;
}

interface HomeProps {
  setPage: (page: Page) => void;
  currentUser: HomeUser | null;
}

const RECENT_REPERTOIRES = 4;

const Home = ({ setPage, currentUser }: HomeProps) => {
  const storage = useMemo(() => new FileSystemStorageProvider(), []);
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    storage.loadRepertoires().then(setRepertoires);
    storage.loadFolders().then(setFolders);
  }, [storage]);

  const recent = [...repertoires].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, RECENT_REPERTOIRES);

  return (
    <main className="main-content">
      <div className={shared.page}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.greeting}>{currentUser ? `Welcome back, ${currentUser.username}` : 'Welcome to ChessBox'}</h1>
            <p className={styles.tagline}>Your openings, your games, one place to train.</p>
          </div>
          <div className={styles.heroActions}>
            <button className={shared.btnPrimary} onClick={() => setPage('board')}>Analyse a position</button>
            <button className={shared.btnOutline} onClick={() => setPage('novelty')}>Find novelties</button>
          </div>
        </section>

        <section className={styles.grid}>
          {/* Analysis board: the biggest tile */}
          <button className={`${styles.tile} ${styles.tileFeature}`} onClick={() => setPage('board')}>
            <img src={boardIcon} className={styles.featureIcon} />
            <span className={styles.tileTitle}>Analysis Board</span>
            <span className={styles.tileText}>Play through lines, explore variations, import and export PGN or FEN.</span>
          </button>

          {/* Repertoires, with the most recently edited ones */}
          <div className={`${styles.tile} ${styles.tileWide}`} onClick={() => setPage('repertoires')} role="button">
            <div className={styles.tileHead}>
              <img src={repertoiresIcon} className={styles.tileIcon} />
              <span className={styles.tileTitle}>Repertoires</span>
              <span className={styles.count}>
                {repertoires.length} repertoire{repertoires.length === 1 ? '' : 's'} · {folders.length} folder{folders.length === 1 ? '' : 's'}
              </span>
            </div>
            {recent.length > 0 ? (
              <ul className={styles.list}>
                {recent.map(r => (
                  <li key={r.id} className={styles.listItem}>
                    <span className={r.side === 'white' ? styles.sideWhite : styles.sideBlack} title={`Plays ${r.side}`} />
                    {r.name}
                  </li>
                ))}
              </ul>
            ) : (
              <span className={styles.tileText}>No repertoires yet. Import one from chessgraph to get started.</span>
            )}
          </div>

          {/* Toolkit and its tools */}
          <div className={`${styles.tile} ${styles.tileWide}`} onClick={() => setPage('tools')} role="button">
            <div className={styles.tileHead}>
              <img src={toolsIcon} className={styles.tileIcon} />
              <span className={styles.tileTitle}>Toolkit</span>
            </div>
            <div className={styles.toolRow}>
              <button className={styles.tool} onClick={e => { e.stopPropagation(); setPage('novelty'); }}>
                <img src={noveltyIcon} className={styles.toolIcon} />
                <span>Novelty Finder</span>
              </button>
              <div className={`${styles.tool} ${styles.toolSoon}`}>
                <img src={weakPointsIcon} className={styles.toolIcon} />
                <span>WeakPoints</span>
                <span className={shared.soonBadge}>Soon</span>
              </div>
            </div>
          </div>

          <button className={styles.tile} onClick={() => setPage('analytics')}>
            <div className={styles.tileHead}>
              <img src={analyticsIcon} className={styles.tileIcon} />
              <span className={styles.tileTitle}>Analytics</span>
            </div>
            <span className={styles.tileText}>Opening success rates across Chess.com and Lichess.</span>
          </button>

          {/* Settings, showing which chess accounts are linked */}
          <button className={styles.tile} onClick={() => setPage('settings')}>
            <div className={styles.tileHead}>
              <img src={settingsIcon} className={styles.tileIcon} />
              <span className={styles.tileTitle}>Settings</span>
            </div>
            <span className={styles.account}>
              Lichess: <strong>{currentUser?.lichessName ?? 'not linked'}</strong>
            </span>
            <span className={styles.account}>
              Chess.com: <strong>{currentUser?.chesscomName ?? 'not linked'}</strong>
            </span>
          </button>
        </section>
      </div>
    </main>
  );
};

export default Home;
