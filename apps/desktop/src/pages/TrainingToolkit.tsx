/* apps/desktop/src/pages/TrainingToolkit.tsx */

import Sidebar from '../components/SidebarModule';
import { PageHeader } from '../components/PageHeader';
import shared from './PageShared.module.css';
import type { Page } from '../types/Page';

import toolsIcon from '../assets/icons/007-king.png';
import knightIcon from '../assets/icons/044-knight.png';
import checkmateIcon from '../assets/icons/041-checkmate.png';
import ideaIcon from '../assets/icons/009-idea.png';
import timerIcon from '../assets/icons/028-timer.png';

interface TrainingToolkitProps {
    page: Page;
    setPage: (page: Page) => void;
}

// planned tools (TODO #4, #5, #8) — cards are disabled until each one is built
const TOOLS = [
    {
        icon: knightIcon,
        title: 'Repertoire Drill',
        text: 'Play your lines from memory against the board, one move at a time.',
    },
    {
        icon: checkmateIcon,
        title: 'Deviation Review',
        text: 'Revisit the positions where your games most often left your prep.',
    },
    {
        icon: ideaIcon,
        title: 'Novelty Analyser',
        text: 'Evaluate new moves with Stockfish and add the good ones to a repertoire.',
    },
    {
        icon: timerIcon,
        title: 'Timed Recall',
        text: 'Test how quickly you can find your repertoire move under the clock.',
    },
];

const TrainingToolkit = ({ setPage }: TrainingToolkitProps) => {
    return (
        <div className="app-layout">
            <Sidebar setPage={setPage} />

            <main className="main-content">
                <div className={shared.page}>
                    <PageHeader
                        icon={toolsIcon}
                        title="Training Tools"
                        subtitle="Turn your repertoires and game history into practice."
                    />

                    <section className={shared.cardGrid}>
                        {TOOLS.map(t => (
                            <button key={t.title} className={shared.featureCard} disabled>
                                <span className={shared.soonBadge}>Coming soon</span>
                                <img src={t.icon} className={shared.featureCardIcon} />
                                <span className={shared.featureCardTitle}>{t.title}</span>
                                <span className={shared.featureCardText}>{t.text}</span>
                            </button>
                        ))}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default TrainingToolkit;
