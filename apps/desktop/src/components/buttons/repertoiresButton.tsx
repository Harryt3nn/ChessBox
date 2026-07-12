/*apps/desktop/src/components/buttons/repertoiresButton.tsx */


interface RepertoiresButtonProps {
  onClick: () => void;
}


export function RepertoiresButton({onClick}:RepertoiresButtonProps){
    return(
        <button onClick={onClick}>
          <i className="fa-solid fa-book-open"></i>
            <span>Repertoires</span>
        </button>
    )
}