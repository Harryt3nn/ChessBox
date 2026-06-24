/* src/components/buttons/noveltyFinderButton.tsx */


interface NoveltyFinderButtonProps{
    onClick: () => void
}


export function NoveltyFinderButton({onClick}:NoveltyFinderButtonProps){
    return (
        <button onClick = {onClick}>
            <span>Novelty Finder</span>
          </button>
          )
}