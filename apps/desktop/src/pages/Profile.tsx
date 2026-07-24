/* apps/desktop/src/pages/Profile.tsx */

import Sidebar from '../components/SidebarModule';
import { setAuthToken } from '../trpc';
import type { Page } from '../types/Page';

interface ProfileProps {
    page: Page;
    setPage: (page: Page) => void;
    onLogout: () => void;
}

const Profile = ({ page, setPage, onLogout }: ProfileProps) => {
    async function handleLogout() {
        setAuthToken(null);
        await window.storage.clearAuthToken();
        onLogout();
    }

    return (
        <div className="app-layout">
            <Sidebar setPage={setPage} />

            <main className="main-content">
                <h1>Profile page coming soon...</h1>
                <button onClick={handleLogout}>Log Out</button>
            </main>
        </div>
    );
};

export default Profile