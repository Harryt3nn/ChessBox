/* src/components/buttons/homeButton.tsx */


interface HomeButtonProps {
  onBack: () => void;
}


export function HomeButton({ onBack }: HomeButtonProps) {
  return (
    <button onClick={onBack}>
      <span>Back</span>
    </button>
  );
}