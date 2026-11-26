/* apps/desktop/src/pages/TrainingToolkit.tsx */

import { PageHeader } from '../components/PageHeader';
import shared from './PageShared.module.css';
import type { Page } from '../types/Page';

interface TrainingToolkitProps {
    page: Page;
    setPage: (page: Page) => void;
}

// each tool is its own page; a tool without a page yet shows as "Coming soon"
const TOOLS: { title: string; text: string; page?: Page }[] = [
    {
        title: 'Novelty Finder',
        text: 'Check your games against a repertoire: where you left prep, and the new moves worth adding.',
        page: 'novelty',
    },
    {
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
