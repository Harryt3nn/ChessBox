/* apps/desktop/src/pages/TrainingToolkit.tsx */

import Sidebar from '../components/SidebarModule';
import type { Page } from '../types/Page';

interface TrainingToolkitProps {
    page: Page;
    setPage: (page: Page) => void;
}

const TrainingToolkit = ({ page, setPage }: TrainingToolkitProps) => {
    return (
        <div className="app-layout">
            <Sidebar setPage={setPage} />

            <main className="main-content">
                <h1>Training Tools</h1>
            </main>
        </div>
    );
};

export default TrainingToolkit;
