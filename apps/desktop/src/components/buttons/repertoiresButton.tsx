/*apps/desktop/src/components/buttons/repertoiresButton.tsx */

import styles from "./iconRules.module.css";
import repertoiresIcon from "../../assets/icons/RookBookIcon.png";

interface RepertoiresButtonProps {
  onClick: () => void;
}


export function RepertoiresButton({onClick}:RepertoiresButtonProps){
    return(
        <button onClick={onClick}>
          <img
        src={repertoiresIcon}
        className={styles.icon}
      />
            <span>Repertoires</span>
        </button>
    )
}