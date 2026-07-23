/*apps/desktop/src/components/buttons/profileButton.tsx*/

import styles from "./iconRules.module.css";
import profileIcon from "../../assets/icons/ProfileIcon.png";

interface ProfileButtonProps{
    onClick: () => void
}

export function ProfileButton({onClick}:ProfileButtonProps){
    return (
        <button onClick = {onClick}>
        <img
            src={profileIcon}
            className={styles.icon}
       />
       <span>Profile</span>
    </button>
    );
}