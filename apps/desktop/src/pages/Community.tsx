/* apps/desktop/src/pages/Community.tsx */

import Sidebar from '../components/SidebarModule';
import type { Page } from '../types/Page';

interface CommunityProps {
    page: Page;
    setPage: (page: Page) => void;
}

const Community = ({ page, setPage }: CommunityProps) => {
    return (
        <div className="app-layout">
            <Sidebar setPage={setPage} />

            <main className="main-content">
                <h1>Community page coming soon...</h1>
            </main>
        </div>
    );
};

export default Community;