/* apps/desktop/src/pages/NoveltyFinder.tsx */

import Sidebar from '../components/SidebarModule';
import type { Page } from '../types/Page';

interface NoveltyFinderProps {
  page: Page;
  setPage: (page: Page) => void;
  currentUser: any; // or your inferred User type
}

const NoveltyFinder = ({ page, setPage, currentUser }: NoveltyFinderProps) => {

  async function handleLichessImport() {
    if (!currentUser) {
      alert("You are not logged in.");
      return;
    }

    if (!currentUser.lichessName) {
      alert("You haven't linked your Lichess account yet. Go to Settings.");
      return;
    }

    const res = await window.api.importLichess(currentUser.lichessName);

    if (res.ok) {
      alert("Lichess games imported!");
    } else {
      alert("Import failed: " + res.error);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <h1>Novelty Finder coming soon...</h1>
        <button onClick={handleLichessImport}>Import Lichess</button>
      </main>
    </div>
  );
};

export default NoveltyFinder;
