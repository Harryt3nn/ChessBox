import React, { useState } from 'react';
import App from '../App';
import Settings from './Settings';
type Page = 'home' | 'analytics' | 'tools' | 'settings' | 'repertoires';
const TrainingToolkit = ({ onBack }: { onBack: () => void }) => {
    const [page, setPage] = useState<Page>('home');
    if (page === 'settings') return <Settings onBack={() => setPage('home')} />;

    return (
        <div className="app-layout">
    <aside className="sidebar">
      <div className="sidebar-logo">
        <i className="fa-solid fa-chess-knight"></i>
        <span>CTT</span>
      </div>
      <nav className="sidebar-nav">
      </nav>
      <div className="sidebar-bottom">
         <button onClick={onBack}>
            <i className="fa-solid fa-house"></i>
            <span>Home</span>
          </button>
        <button onClick={() => setPage('settings')}>
          <i className="fa-solid fa-gear"></i>
          <span>Settings</span>
        </button>
      </div>
    </aside>
    <main className="main-content">
      <h1>Training Tools</h1>
    </main>
  </div>
    )
};

export default TrainingToolkit