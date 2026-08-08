/*apps/desktop/src/components/buttons/settingsButton.tsx */

import styles from "./iconRules.module.css";
import boardIcon from "../../assets/icons/021-chess board.png";

interface BoardButtonProps{
    onClick: () => void
}

export function BoardButton({onClick}:BoardButtonProps){
    return (
        <button onClick = {onClick}>
        <img
            src={boardIcon}
            className={styles.icon}
       />
       <span>Analysis Board</span>
    </button>
    );
}