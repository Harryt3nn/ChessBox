/* apps/desktop/src/pages/TrainingToolkit.tsx */

import { PageHeader } from '../components/PageHeader';
import shared from './PageShared.module.css';
import type { Page } from '../types/Page';

import toolsIcon from '../assets/icons/007-king.png';
import noveltyIcon from '../assets/icons/020-chess.png';
import weakPointsIcon from '../assets/icons/041-checkmate.png';

interface TrainingToolkitProps {
    page: Page;
    setPage: (page: Page) => void;
}

// each tool is its own page; a tool without a page yet shows as "Coming soon"
const TOOLS: { icon: string; title: string; text: string; page?: Page }[] = [
    {
        icon: noveltyIcon,
        title: 'Novelty Finder',
        text: 'Check your games against a repertoire: where you left prep, and the new moves worth adding.',
        page: 'novelty',
    },
    {
        icon: weakPointsIcon,
        title: 'WeakPoints',
        text: 'Drill the lines you get wrong, revisit the ones you rarely reach, keep the strong ones fresh.',
        page: 'weakpoints',
    },
];

const TrainingToolkit = ({ setPage }: TrainingToolkitProps) => {
    return (
        <main className="main-content">
            <div className={shared.page}>
                <PageHeader
                    icon={toolsIcon}
                    title="Toolkit"
                    subtitle="Turn your repertoires and game history into practice."
                />

                <section className={shared.cardGrid}>
                    {TOOLS.map(t => (
                        <button
                            key={t.title}
                            className={shared.featureCard}
                            disabled={!t.page}
                            onClick={() => t.page && setPage(t.page)}
                        >
                            {!t.page && <span className={shared.soonBadge}>Coming soon</span>}
                            <img src={t.icon} className={shared.featureCardIcon} />
                            <span className={shared.featureCardTitle}>{t.title}</span>
                            <span className={shared.featureCardText}>{t.text}</span>
                        </button>
                    ))}
                </section>
            </div>
        </main>
    );
};

export default TrainingToolkit;
