/* apps/desktop/src/App.tsx */

import { useState, useEffect } from 'react';
import EditRepertoires from './pages/EditRepertoires';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import TrainingToolkit from './pages/TrainingToolkit';
import BoardView from './pages/BoardView';
import NoveltyFinder from './pages/NoveltyFinder';
import Sidebar from "./components/SidebarModule";
import { LogIn } from './components/logIn';
import { restoreAuthToken } from './trpc';
import type { Page } from './types/Page';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@chessbox/shared/router';

type RouterOutput = inferRouterOutputs<AppRouter>;
type User = RouterOutput["auth"]["me"];

const App = () => {
  const [page, setPage] = useState<Page>('home');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    restoreAuthToken().then(({ success, user }) => {
      setIsAuthed(success);
      setCurrentUser(user);
      setAuthChecked(true);
    });
  }, []);

  function renderPage() {
    if (page === 'analytics') return <Analytics page={page} setPage={setPage} />;
    if (page === 'repertoires') return <EditRepertoires page={page} setPage={setPage} />;
    if (page === 'tools') return <TrainingToolkit page={page} setPage={setPage} />;
    if (page === 'settings') return <Settings page={page} setPage={setPage} onLogout={() => { setIsAuthed(false); setCurrentUser(null); }} isAuthed={isAuthed} />;
    if (page === 'board') return <BoardView page={page} setPage={setPage} />;
    if (page === 'novelty') return <NoveltyFinder page={page} setPage={setPage} currentUser={currentUser} />;
    

    return (
      <div className="app-layout">
        <Sidebar setPage={setPage} />
        <main className="main-content">
          
            
        </main>
      </div>
    );
  }

  return (
    <>
      <div className={authChecked && !isAuthed ? 'locked' : undefined}>
        {renderPage()}
      </div>

      {authChecked && !isAuthed && (
        <LogIn onSuccess={(user) => {
          setIsAuthed(true);
          setCurrentUser(user);
        }} />
      )}
    </>
  );
}

export default App;