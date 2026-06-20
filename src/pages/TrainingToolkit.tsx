/*src/pages/TrainingToolkit*/

import React, { useState } from 'react';
import App from '../App';
import Settings from './Settings';

// returns raw html for training tools page

type Page = 'home' | 'analytics' | 'tools' | 'settings' | 'repertoires' | 'board';

const TrainingToolkit = ({ onBack }: { onBack: () => void }) => {
    const [page, setPage] = useState<Page>('home');
    if (page === 'settings') return <Settings onBack={() => setPage('home')} />;

    return (
        <div className="app-layout">
    <aside className="sidebar">
      <div className="sidebar-logo">
        <i className="fa-solid fa-chess-queen"></i>
        <span>CTT</span>
      </div>
      <nav className="sidebar-nav">
        <button onClick={() => setPage('repertoires')}>
          <i className="fa-solid fa-book-open"></i>
          <span>Repertoires</span>
        </button>
        <button onClick={() => setPage('analytics')}>
          <i className="fa-solid fa-chart-line"></i>
          <span>Analytics</span>
        </button>
        <button onClick={() => setPage('tools')}>
          <i className="fa-solid fa-dumbbell"></i>
          <span>Training</span>
        </button>
        <button onClick={() => setPage('board')}>
          <i className="fa-solid fa-chess-board"></i>
          <span>Board</span>
        </button>
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