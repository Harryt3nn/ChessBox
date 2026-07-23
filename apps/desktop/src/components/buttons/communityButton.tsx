/*apps/desktop/src/components/buttons/communityButton.tsx*/

import styles from "./iconRules.module.css";
import communityIcon from "../../assets/icons/FriendsIcon.png";

interface CommunityButtonProps{
    onClick: () => void
}

export function CommunityButton({onClick}:CommunityButtonProps){
    return (
        <button onClick = {onClick}>
        <img
            src={communityIcon}
            className={styles.icon}
       />
       <span>Community</span>
    </button>
    );
}