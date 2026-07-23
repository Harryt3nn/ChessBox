/*apps/desktop/src/components/buttons/noveltyFinderButton.tsx */


import styles from "./iconRules.module.css";
import noveltyIcon from "../../assets/icons/novelty.png";

interface NoveltyFinderButtonProps{
    onClick: () => void
}


export function NoveltyFinderButton({onClick}:NoveltyFinderButtonProps){
    return (
        <button onClick = {onClick}>
            <img
                src={noveltyIcon}
                className={styles.icon}
            />
            <span>Novelty Finder</span>
          </button>
          )
}