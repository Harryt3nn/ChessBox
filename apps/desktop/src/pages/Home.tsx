/* apps/desktop/src/pages/Home.tsx */

import Sidebar from '../components/SidebarModule';
import { PageHeader } from '../components/PageHeader';
import shared from './PageShared.module.css';
import type { Page } from '../types/Page';

import homeIcon from '../assets/icons/001-timer.png';
import repertoiresIcon from '../assets/icons/015-chess.png';
import boardIcon from '../assets/icons/021-chess board.png';
import noveltyIcon from '../assets/icons/020-chess.png';
import analyticsIcon from '../assets/icons/029-strategy.png';
import toolsIcon from '../assets/icons/007-king.png';
import settingsIcon from '../assets/icons/003-chess.png';

interface HomeProps {
  setPage: (page: Page) => void;
}

// shortcut cards — icons match the sidebar so each section reads the same everywhere
const SHORTCUTS: { page: Page; icon: string; title: string; text: string }[] = [
  { page: 'repertoires', icon: repertoiresIcon, title: 'Repertoires', text: 'Browse, organise and import your opening graphs.' },
  { page: 'board', icon: boardIcon, title: 'Analysis Board', text: 'Play through lines, explore variations, copy FEN and PGN.' },
  { page: 'novelty', icon: noveltyIcon, title: 'Novelty Finder', text: 'Import your games and find where they leave your prep.' },
  { page: 'analytics', icon: analyticsIcon, title: 'Analytics', text: 'Opening success rates across Chess.com and Lichess.' },
  { page: 'tools', icon: toolsIcon, title: 'Training Tools', text: 'Drill your repertoires and review recurring deviations.' },
  { page: 'settings', icon: settingsIcon, title: 'Settings', text: 'Your profile and connected chess accounts.' },
];

const Home = ({ setPage }: HomeProps) => {
  return (
    <div className="app-layout">
      <Sidebar setPage={setPage} />

      <main className="main-content">
        <div className={shared.page}>
          <PageHeader
            icon={homeIcon}
            title="ChessBox"
            subtitle="Your openings, your games, one place to train."
          />

          <section className={shared.cardGrid}>
            {SHORTCUTS.map(s => (
              <button key={s.page} className={shared.featureCard} onClick={() => setPage(s.page)}>
                <img src={s.icon} className={shared.featureCardIcon} />
                <span className={shared.featureCardTitle}>{s.title}</span>
                <span className={shared.featureCardText}>{s.text}</span>
              </button>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Home;
