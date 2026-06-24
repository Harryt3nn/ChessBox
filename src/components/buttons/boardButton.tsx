/* src/components/buttons/settingsButton.tsx */


interface BoardButtonProps{
    onClick: () => void
}


export function BoardButton({onClick}:BoardButtonProps){
    return (
        <button onClick = {onClick}>
            <i className="fa-solid fa-chess-board"></i>
            <span>Board</span>
          </button>
          )
}