/* apps/desktop/src/pages/Analytics.tsx */

import Sidebar from '../components/SidebarModule';
import type { Page } from '../types/Page';

interface AnalyticsProps {
    page: Page;
    setPage: (page: Page) => void;
}

const Analytics = ({ page, setPage }: AnalyticsProps) => {
    return (
        <div className="app-layout">
            <Sidebar setPage={setPage} />

            <main className="main-content">
                <h1>Analytics</h1>
            </main>
        </div>
    );
};

export default Analytics;
