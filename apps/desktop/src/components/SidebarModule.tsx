/*apps/desktop/src/components/SidebarModule.tsx*/

import React from "react";
import styles from "./SidebarModule.module.css";

import { RepertoiresButton } from "./buttons/repertoiresButton";
import { AnalyticsButton } from "./buttons/analyticsButton";
import { ToolsButton } from "./buttons/toolsButton";
import { BoardButton } from "./buttons/boardButton";
import { NoveltyFinderButton } from "./buttons/noveltyFinderButton";
import { SettingsButton } from "./buttons/settingsButton";
import { HomeButton } from "./buttons/homeButton";
import type { Page } from '../types/Page';

interface SidebarProps {
  setPage: (page: Page) => void;
}

export default function Sidebar({ setPage }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles["sidebar-logo"]}>
        <span>ChessBox</span>
      </div>

      <nav className={styles["sidebar-nav"]}>
        <RepertoiresButton onClick={() => setPage("repertoires")} />
        <AnalyticsButton onClick={() => setPage("analytics")} />
        <ToolsButton onClick={() => setPage("tools")} />
        <BoardButton onClick={() => setPage("board")} />
        <NoveltyFinderButton onClick={() => setPage("novelty")} />
      </nav>

      <div className={styles["sidebar-bottom"]}>
        <HomeButton onClick={() => setPage("home")}/>
        <SettingsButton onClick={() => setPage("settings")} />
      </div>
    </aside>
  );
}