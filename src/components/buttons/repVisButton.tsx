/* src/components/buttons/repVisButton.tsx */


interface RepVisButtonProps {
  onClick: () => void;
}


export function RepVisButton({onClick}:RepVisButtonProps){
    return(
        <button onClick={onClick}>
            <span>View</span>
        </button>
    )
}