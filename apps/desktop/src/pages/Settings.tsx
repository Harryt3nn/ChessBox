/* apps/desktop/src/pages/Settings.tsx */

import { useState } from 'react';
import Sidebar from '../components/SidebarModule';
import styles from './Settings.module.css';
import type { Page } from '../types/Page';

interface SettingsProps {
    page: Page;
    setPage: (page: Page) => void;
}

const Settings = ({ page, setPage }: SettingsProps) => {
  const [showChessConnect, setShowChessConnect] = useState(false);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function validateChessComUser(username: string) {
    const res = await fetch(`http://localhost:3001/api/chesscom/${username}`);
    return res.ok;
  }

  const handleSaveChessUsername = async () => {
    const valid = await validateChessComUser(username);

    if (valid) {
      setStatus("success");
      console.log("Saving Chess.com username:", username);
      setTimeout(() => {
        setShowChessConnect(false);
        setStatus("idle");
      }, 1200);
    } else {
      setStatus("error");
    }
  };

  return (
    <div className="app-layout">
      <Sidebar setPage={setPage} />

      <main className={`main-content ${styles.settingsPage}`}>
        <div className={styles.settingsSection}>
          <button
            className={`${styles.connectBtn} ${styles.chesscomBtn}`}
            onClick={() => setShowChessConnect(true)}
          >
            <i className="fa-solid fa-chess-board"></i>
            Connect Chess.com
          </button>

          <button
            className={`${styles.connectBtn} ${styles.lichessBtn}`}
            onClick={() => setShowChessConnect(true)}
          >
            <i className="fa-solid fa-chess-board"></i>
            Connect Lichess
          </button>
        </div>

        {showChessConnect && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3>Connect Chess.com</h3>
              <p>Enter your Chess.com username</p>

              <input
                className={styles.modalInput}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. John_Chess123"
              />

              {status === "success" && (
                <div className={styles.modalSuccess}>✓ Account found!</div>
              )}

              {status === "error" && (
                <div className={styles.modalError}>✗ Username not found</div>
              )}

              <div className={styles.modalActions}>
                <button className={styles.modalSave} onClick={handleSaveChessUsername}>
                  Save
                </button>
                <button
                  className={styles.modalCancel}
                  onClick={() => setShowChessConnect(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
