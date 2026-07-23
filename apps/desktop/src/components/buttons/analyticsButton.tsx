/*apps/desktop/src/components/buttons/analyticsButton.tsx */

import styles from "./iconRules.module.css";
import analyticsIcon from "../../assets/icons/AnalyticsPawnIcon.png";

interface AnalyticsButtonProps {
  onClick: () => void;
}

export function AnalyticsButton({ onClick }: AnalyticsButtonProps) {
  return (
    <button onClick={onClick}>
      <img
        src={analyticsIcon}
        className={styles.icon}
      />
      <span>Analytics</span>
    </button>
  );
}
