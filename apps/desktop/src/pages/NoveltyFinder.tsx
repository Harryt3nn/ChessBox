/*apps/desktop/src/pages/NoveltyFinder.tsx */


import { useState } from 'react';
import { HomeButton } from '../components/buttons/homeButton';
import { SettingsButton} from '../components/buttons/settingsButton';
import type { Page } from '../types/Page';


const NoveltyFinder = ({ onBack }: { onBack: () => void }) => {
    const [page, setPage] = useState<Page>('home');
    
    return (


        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <i className="fa-solid fa-chess-queen"></i>
                    <span>ChessBox</span>
                </div>
                <nav className="sidebar-nav"></nav>
                <div className="sidebar-bottom">
                    <HomeButton onBack={onBack}/>
                    <SettingsButton onClick={onBack}/>
                </div>
            </aside>
            <main className="main-content">
            </main>
        </div>
    );
};


export default NoveltyFinder;