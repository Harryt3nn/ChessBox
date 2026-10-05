/*apps/desktop/src/components/PageHeader.tsx*/

import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

// shared page title bar: framed section icon, amber title, subtitle, optional actions on the right
// icon should be the same one the page uses in the sidebar

interface PageHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.iconFrame}>
        <img src={icon} className={styles.icon} />
      </div>

      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
