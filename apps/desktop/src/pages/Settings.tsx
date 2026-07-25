/* apps/desktop/src/pages/Settings.tsx */

import { useState } from 'react';
import Sidebar from '../components/SidebarModule';
import { trpc } from '../trpc';
import styles from './Settings.module.css';
import type { Page } from '../types/Page';

interface SettingsProps {
  page: Page;
  setPage: (page: Page) => void;
}

const Settings = ({ page, setPage }: SettingsProps) => {
  const [showChessConnect, setShowChessConnect] = useState(false);
  const [service, setService] = useState<"chesscom" | "lichess" | null>(null);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSave = async () => {
    if (!service) return;

    try {
      if (service === "chesscom") {
        await trpc.connections.connectChesscom.mutate({ username });
      } else {
        await trpc.connections.connectLichess.mutate({ username });
      }

      setStatus("success");
      setTimeout(() => {
        setShowChessConnect(false);
        setStatus("idle");
        setUsername("");
        setService(null);
      }, 1200);
    } catch {
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
            onClick={() => {
              setService("chesscom");
              setShowChessConnect(true);
            }}
          >
            <i className="fa-solid fa-chess-board"></i>
            Connect Chess.com
          </button>

          <button
            className={`${styles.connectBtn} ${styles.lichessBtn}`}
            onClick={() => {
              setService("lichess");
              setShowChessConnect(true);
            }}
          >
            <i className="fa-solid fa-chess-board"></i>
            Connect Lichess
          </button>
        </div>

        {showChessConnect && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3>
                {service === "chesscom"
                  ? "Connect Chess.com"
                  : "Connect Lichess"}
              </h3>

              <p>
                Enter your {service === "chesscom" ? "Chess.com" : "Lichess"} username
              </p>

              <input
                className={styles.modalInput}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={
                  service === "chesscom"
                    ? "e.g. John_Chess123"
                    : "e.g. MagnusCarlsen"
                }
              />

              {status === "success" && (
                <div className={styles.modalSuccess}>✓ Account found!</div>
              )}

              {status === "error" && (
                <div className={styles.modalError}>✗ Username not found</div>
              )}

              <div className={styles.modalActions}>
                <button className={styles.modalSave} onClick={handleSave}>
                  Save
                </button>
                <button
                  className={styles.modalCancel}
                  onClick={() => {
                    setShowChessConnect(false);
                    setStatus("idle");
                    setUsername("");
                    setService(null);
                  }}
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

export default Settings