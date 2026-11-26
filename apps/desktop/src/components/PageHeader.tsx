/*apps/desktop/src/components/PageHeader.tsx*/

import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

// shared page title bar: display-face title, subtitle, optional actions on the right.
// No icon: Harry's rule is no decorative icons unless a control needs one (D45)

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
