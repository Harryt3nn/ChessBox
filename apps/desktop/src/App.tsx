/* apps/desktop/src/App.tsx */

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import EditRepertoires from './pages/EditRepertoires';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import TrainingToolkit from './pages/TrainingToolkit';
import BoardView from './pages/BoardView';
import NoveltyFinder from './pages/NoveltyFinder';
import Home from './pages/Home';
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
    restoreAuthToken().then(session => {
      // can't check the saved session: stay signed in so local work carries on
      if (session.status === 'unverified') {
        toast.error("Can't reach the ChessBox server. Your repertoires and board still work; account features will be back once it's reachable.", { duration: 8000 });
      }
      setIsAuthed(session.status !== 'signedOut');
      setCurrentUser(session.status === 'signedIn' ? session.user : null);
      setAuthChecked(true);
    });
  }, []);

  function handleLogout() {
    setIsAuthed(false);
    setCurrentUser(null);
  }

  function renderPage() {
    if (page === 'analytics') return <Analytics page={page} setPage={setPage} />;
    if (page === 'repertoires') return <EditRepertoires page={page} setPage={setPage} />;
    if (page === 'tools') return <TrainingToolkit page={page} setPage={setPage} />;
    if (page === 'settings') return <Settings page={page} setPage={setPage} onLogout={handleLogout} isAuthed={isAuthed} />;
    if (page === 'board') return <BoardView page={page} setPage={setPage} />;
    if (page === 'novelty') return <NoveltyFinder page={page} setPage={setPage} currentUser={currentUser} />;

    return <Home setPage={setPage} />;
  }

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface-2)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 0,
            fontSize: 13,
          },
        }}
      />
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