/* apps/desktop/src/App.tsx */

import { useState } from 'react';
import EditRepertoires from './pages/EditRepertoires';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import TrainingToolkit from './pages/TrainingToolkit';
import BoardView from './pages/BoardView';
import NoveltyFinder from './pages/NoveltyFinder';
import Profile from './pages/Profile';
import Community from './pages/Community';
import styles from './pages/App.module.css';

import Sidebar from "./components/SidebarModule";
import type { Page } from './types/Page';

const App = () => {
  const [page, setPage] = useState<Page>('home');

  if (page === 'analytics') return <Analytics page={page} setPage={setPage} />;
  if (page === 'repertoires') return <EditRepertoires page={page} setPage={setPage} />;
  if (page === 'tools') return <TrainingToolkit page={page} setPage={setPage} />;
  if (page === 'settings') return <Settings page={page} setPage={setPage} />;
  if (page === 'board') return <BoardView page={page} setPage={setPage} />;
  if (page === 'novelty') return <NoveltyFinder page={page} setPage={setPage} />;
  if (page === 'profile') return <Profile page={page} setPage={setPage} />;
  if (page === 'community') return <Community page={page} setPage={setPage} />;


  return (
    <div className="app-layout">
      <Sidebar setPage={setPage} />

      <main className="main-content">
      <div className={styles.center}>
        <h1>Home page coming soon...</h1>
      </div>
      </main>
    </div>
  );
}

export default App;
