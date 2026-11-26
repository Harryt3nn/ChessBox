/* apps/desktop/src/pages/Analytics.tsx */

import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import shared from './PageShared.module.css';


// layout only for now — the stats are filled in once game processing exists (TODO #4)
// toggles already hold state so they can drive the data queries later

type Source = 'combined' | 'chesscom' | 'lichess';
type Period = 'latest' | 'today' | 'week' | 'all';

const SOURCES: { id: Source; label: string }[] = [
  { id: 'combined', label: 'Combined' },
  { id: 'chesscom', label: 'Chess.com' },
  { id: 'lichess', label: 'Lichess' },
];

const PERIODS: { id: Period; label: string }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'all', label: 'All Time' },
];

const STATS = ['Games', 'Win Rate', 'In Repertoire', 'Deviations'];

const Analytics = () => {
  const [source, setSource] = useState<Source>('combined');
  const [period, setPeriod] = useState<Period>('all');

  return (
    <main className="main-content">
      <div className={shared.page}>
        <PageHeader
          title="Analytics"
          subtitle="Opening performance across your connected accounts."
          actions={
            <button className={shared.btnOutline} disabled title="Coming soon">
              Refresh
            </button>
          }
        />

        {/* Filters */}
        <div className={shared.panelHeader}>
          <div className={shared.toggle}>
            {SOURCES.map(s => (
              <button
                key={s.id}
                className={`${shared.toggleBtn} ${source === s.id ? shared.toggleActive : ''}`}
                onClick={() => setSource(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className={shared.toggle}>
            {PERIODS.map(p => (
              <button
                key={p.id}
                className={`${shared.toggleBtn} ${period === p.id ? shared.toggleActive : ''}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Headline stats */}
        <div className={shared.statRow}>
          {STATS.map(label => (
            <div key={label} className={shared.statTile}>
              <span className={shared.statLabel}>{label}</span>
              <span className={`${shared.statValue} ${shared.statValueEmpty}`}>No data yet</span>
            </div>
          ))}
        </div>

        <div className={shared.panelGrid}>
          {/* Openings */}
          <section className={shared.panel}>
            <div className={shared.panelHeader}>
              <h2 className={shared.sectionTitle}>Openings</h2>
              <span className={shared.soonBadge}>Coming soon</span>
            </div>

            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Opening</th>
                  <th>Games</th>
                  <th>Win</th>
                  <th>Draw</th>
                  <th>Loss</th>
                </tr>
              </thead>
            </table>

            <div className={shared.emptyState}>
              <span className={shared.emptyTitle}>No games analysed yet</span>
              <span className={shared.emptyHint}>
                Import your games from the Novelty Finder, then your most played openings
                and their results will appear here.
              </span>
            </div>
          </section>

          {/* Repertoire coverage */}
          <section className={shared.panel}>
            <div className={shared.panelHeader}>
              <h2 className={shared.sectionTitle}>Repertoire Coverage</h2>
              <span className={shared.soonBadge}>Coming soon</span>
            </div>

            <div className={shared.emptyState}>
              <span className={shared.emptyTitle}>Nothing to compare yet</span>
              <span className={shared.emptyHint}>
                See how often your games stay inside your saved repertoires, and how
                deep they get before leaving them.
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Analytics;
