/*src/App.tsx*/


import { useState } from 'react';
import EditRepertoires from './pages/EditRepertoires';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import TrainingToolkit from './pages/TrainingToolkit';
import BoardView from './pages/BoardView';
import { HomeButton } from './components/buttons/homeButton';
import { SettingsButton } from './components/buttons/settingsButton';
import { BoardButton } from './components/buttons/boardButton';
import { ToolsButton } from './components/buttons/toolsButton';
import { AnalyticsButton } from './components/buttons/analyticsButton';
import { RepertoiresButton } from './components/buttons/repertoiresButton';
import type { Page } from './types/Page';


const App = () => {
  const [page, setPage] = useState<Page>('home');

  if (page === 'repertoires') return <EditRepertoires onBack={() => setPage('home')} />;
  if (page === 'analytics') return <Analytics onBack={() => setPage('home')} />;
  if (page === 'tools') return <TrainingToolkit onBack={() => setPage('home')} />;
  if (page === 'settings') return <Settings onBack={() => setPage('home')} />;
  if (page === 'board') return <BoardView onBack={() => setPage('home')} />;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <i className="fa-solid fa-chess-queen"></i>
          <span>CTT</span>
        </div>
        <nav className="sidebar-nav">
          <RepertoiresButton onClick={() => setPage('repertoires')}/>
          <AnalyticsButton onClick={() => setPage('analytics')}/>
          <ToolsButton onClick = {() => setPage('tools')}/>
          <BoardButton onClick={() => setPage('board')}/>
        </nav>
        <div className="sidebar-bottom">
          <HomeButton onBack={() => setPage('home')} />
          <SettingsButton onClick={() => setPage('settings')} />
        </div>
      </aside>
      <main className="main-content">
        <h1>Home page coming soon...</h1>
      </main>
    </div>
  );
}


export default App;