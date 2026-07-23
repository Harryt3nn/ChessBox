/* apps/desktop/src/pages/NoveltyFinder.tsx */

import Sidebar from '../components/SidebarModule';
import type { Page } from '../types/Page';

interface NoveltyFinderProps {
    page: Page;
    setPage: (page: Page) => void;
}

const NoveltyFinder = ({ page, setPage }: NoveltyFinderProps) => {
    return (
        <div className="app-layout">
            <Sidebar setPage={setPage} />

            <main className="main-content">
                <h1>Novelty Finder coming soon...</h1>
            </main>
        </div>
    );
};

export default NoveltyFinder;