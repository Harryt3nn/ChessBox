/* apps/desktop/src/App.tsx */

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import EditRepertoires from './pages/EditRepertoires';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import TrainingToolkit from './pages/TrainingToolkit';
import BoardView from './pages/BoardView';
import NoveltyFinder from './pages/NoveltyFinder';
import RepertoireBuilder from './pages/RepertoireBuilder';
import Home from './pages/Home';
import { LogIn } from './components/logIn';
import { TopBar } from './components/TopBar';
import { restoreAuthToken } from './trpc';
import type { Page } from './types/Page';
import type { Repertoire } from './types/Repertoire';
import type { BoardFocus } from './pages/BoardView';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@chessbox/shared/router';

type RouterOutput = inferRouterOutputs<AppRouter>;
type User = RouterOutput["auth"]["me"];

const App = () => {
  const [page, setPage] = useState<Page>('home');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // the repertoire the analysis board is showing, if any
  const [boardRepertoire, setBoardRepertoire] = useState<Repertoire | null>(null);
  // a position to jump to once the repertoire is on the board (a novelty-finder result)
  const [boardFocus, setBoardFocus] = useState<BoardFocus | null>(null);

  // the repertoire open in the visual builder
  const [builderRepertoire, setBuilderRepertoire] = useState<Repertoire | null>(null);

  function openBuilder(rep: Repertoire) {
    setBuilderRepertoire(rep);
    setPage('builder');
  }

  function openInBoard(rep: Repertoire, focus?: BoardFocus) {
    setBoardRepertoire(rep);
    setBoardFocus(focus ?? null);
    setPage('board');
  }

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
    if (page === 'analytics') return <Analytics />;
    if (page === 'repertoires') return <EditRepertoires onOpenRepertoire={openInBoard} onBuildRepertoire={openBuilder} />;
    if (page === 'builder' && builderRepertoire) {
      return <RepertoireBuilder key={builderRepertoire.id} repertoire={builderRepertoire} onOpenInBoard={openInBoard} onBack={() => setPage('repertoires')} />;
    }
    if (page === 'tools') return <TrainingToolkit page={page} setPage={setPage} />;
    if (page === 'settings') return <Settings page={page} onLogout={handleLogout} isAuthed={isAuthed} />;
    if (page === 'board') return <BoardView repertoire={boardRepertoire} focus={boardFocus} onCloseRepertoire={() => { setBoardRepertoire(null); setBoardFocus(null); }} />;
    if (page === 'novelty') return <NoveltyFinder page={page} currentUser={currentUser} onOpenInBoard={openInBoard} />;

    return <Home setPage={setPage} currentUser={currentUser} />;
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
      <div className={`app-layout ${authChecked && !isAuthed ? 'locked' : ''}`}>
        <TopBar page={page} setPage={setPage} />
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