/*apps/desktop/src/components/buttons/settingsButton.tsx */


interface SettingsButtonProps {
  onClick: () => void;
}


export function SettingsButton({onClick}:SettingsButtonProps){
    return(
        <button onClick={onClick}>
            <i className="fa-solid fa-gear"></i>
            <span>Settings</span>
        </button>
    )
}