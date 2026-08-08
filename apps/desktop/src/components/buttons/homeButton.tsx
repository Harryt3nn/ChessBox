/*apps/desktop/src/components/buttons/homeButton.tsx */

import styles from "./iconRules.module.css";
import homeIcon from "../../assets/icons/001-timer.png";

interface HomeButtonProps {
  onClick: () => void;
}

export function HomeButton({ onClick }: HomeButtonProps) {
  return (
    <button onClick={onClick}>
       <img
        src={homeIcon}
        className={styles.icon}
      />
      <span>Home</span>
    </button>
  );
}