/*apps/desktop/src/components/buttons/toolsButton.tsx */

import styles from "./iconRules.module.css";
import trainingIcon from "../../assets/icons/TrainingIcon.png";

interface ToolsButtonProps {
  onClick: () => void;
}


export function ToolsButton({onClick}:ToolsButtonProps){
    return (
        <button onClick={onClick}>
            <img
              src={trainingIcon}
              className={styles.icon}
            />
            <span>Training</span>
          </button>
    )
}