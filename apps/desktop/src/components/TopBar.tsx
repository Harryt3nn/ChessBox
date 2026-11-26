/*apps/desktop/src/components/TopBar.tsx*/

import type { Page } from '../types/Page';
import styles from './TopBar.module.css';
import knightIcon from '../assets/icons/044-knight.png';
import { Icon } from './Icon';

// slim navigation bar shown above every page; Home is the hub, so this only carries the main sections

interface TopBarProps {
  page: Page;
  setPage: (page: Page) => void;
}

const SECTIONS: { page: Page; label: string }[] = [
  { page: 'board', label: 'Analysis Board' },
  { page: 'repertoires', label: 'Repertoires' },
  { page: 'tools', label: 'Toolkit' },
  { page: 'analytics', label: 'Analytics' },
];

// tools live inside the Toolkit, so their pages highlight it
const SECTION_OF: Partial<Record<Page, Page>> = { novelty: 'tools', weakpoints: 'tools', builder: 'repertoires' };

export function TopBar({ page, setPage }: TopBarProps) {
  const active = SECTION_OF[page] ?? page;

  return (
    <header className={styles.bar}>
      <button className={styles.brand} onClick={() => setPage('home')} title="Home">
        <Icon src={knightIcon} size={24} />
        ChessBox
      </button>

      <nav className={styles.nav}>
        {SECTIONS.map(s => (
          <button
            key={s.page}
            className={`${styles.link} ${active === s.page ? styles.linkActive : ''}`}
            onClick={() => setPage(s.page)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <button
        className={`${styles.link} ${active === 'settings' ? styles.linkActive : ''}`}
        onClick={() => setPage('settings')}
      >
        Settings
      </button>
    </header>
  );
}
