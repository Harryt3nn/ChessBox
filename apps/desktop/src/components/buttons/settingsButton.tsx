/*apps/desktop/src/components/buttons/settingsButton.tsx */

import styles from "./iconRules.module.css";
import settingsIcon from "../../assets/icons/003-chess.png";
interface SettingsButtonProps {
  onClick: () => void;
}

export function SettingsButton({onClick}:SettingsButtonProps){
    return(
        <button onClick={onClick}>
           <img
                src={settingsIcon}
                className={styles.icon}
            />
            <span>Settings</span>
        </button>
    )
}