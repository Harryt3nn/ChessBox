/*src/pages/Analytics.tsx*/


import { useState } from 'react';
import Settings from './Settings';
import TrainingToolkit from './TrainingToolkit';
import { HomeButton } from '../components/homeButton';
import type {Page} from '../types/Page.ts'


const Analytics = ({ onBack }: { onBack: () => void }) => {
    const [page, setPage] = useState<Page>('home');
    if (page === 'repertoires') return <Analytics onBack={() => setPage('home')} />;
    if (page === 'tools') return <TrainingToolkit onBack={() => setPage('home')} />;
    if (page === 'settings') return <Settings onBack={() => setPage('home')} />;


    return (
        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-logo">
              <i className="fa-solid fa-chess-queen"></i>
              <span>CTT</span></div>
            <nav className="sidebar-nav"></nav>
            <div className="sidebar-bottom">
              <HomeButton onBack={onBack}/>
              <button onClick={() => setPage('settings')}>
            <i className="fa-solid fa-gear"></i>
          <span>Settings</span>
        </button>
      </div>
    </aside>
    <main className="main-content">
      <h1>Analytics</h1>
    </main>
  </div>
    )
};

export default Analytics