/* apps/desktop/src/pages/Profile.tsx */

import Sidebar from '../components/SidebarModule';
import type { Page } from '../types/Page';

interface ProfileProps {
    page: Page;
    setPage: (page: Page) => void;
}

const Profile = ({ page, setPage }: ProfileProps) => {
    return (
        <div className="app-layout">
            <Sidebar setPage={setPage} />

            <main className="main-content">
                <h1>Profile page coming soon...</h1>
            </main>
        </div>
    );
};

export default Profile