/*src/pages/Settings.tsx*/


import { useState } from 'react';



const Settings = ({ onBack }: { onBack: () => void }) => {
  const [showChessConnect, setShowChessConnect] = useState(false);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function validateChessComUser(username: string) {
  const res = await fetch(`http://localhost:3001/api/chesscom/${username}`)
  return res.ok;
}

  const handleSaveChessUsername = async () => {
    const valid = await validateChessComUser(username);

    if (valid) {
      setStatus("success");

      // TODO: Save to filesystem
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
      <aside className="sidebar">
        <div className="sidebar-logo">
          <i className="fa-solid fa-chess-queen"></i>
          <span>CTT</span>
        </div>

        <nav className="sidebar-nav"></nav>

        <div className="sidebar-bottom">
          <button onClick={onBack}>Back</button>
        </div>
      </aside>

      <main className="main-content settings-page">

        <div className="settings-section">
          <button
            className="connect-btn chesscom-btn"
            onClick={() => setShowChessConnect(true)}
          >
            <i className="fa-solid fa-chess-board"></i>
            Connect Chess.com
          </button>

          <button
            className="connect-btn lichess-btn"
            onClick={() => setShowChessConnect(true)}
          >
            <i className="fa-solid fa-chess-board"></i>
            Connect Lichess
          </button>
        </div>

        {showChessConnect && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Connect Chess.com</h3>
              <p>Enter your Chess.com username</p>

              <input
                className="modal-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Harryt3nn"
              />

              {status === "success" && (
                <div className="modal-success">✓ Account found!</div>
              )}

              {status === "error" && (
                <div className="modal-error">✗ Username not found</div>
              )}

              <div className="modal-actions">
                <button className="modal-save" onClick={handleSaveChessUsername}>
                  Save
                </button>
                <button className="modal-cancel" onClick={() => setShowChessConnect(false)}>
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