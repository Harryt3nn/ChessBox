/*apps/desktop/src/components/buttons/toolsButton.tsx */


interface ToolsButtonProps {
  onClick: () => void;
}


export function ToolsButton({onClick}:ToolsButtonProps){
    return (
        <button onClick={onClick}>
            <i className="fa-solid fa-dumbbell"></i>
            <span>Training</span>
          </button>
    )
}