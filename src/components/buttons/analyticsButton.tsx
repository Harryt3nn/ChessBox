/* src/components/buttons/analyticsButton.tsx */


interface AnalyticsButtonProps {
  onClick: () => void;
}


export function AnalyticsButton({onClick}:AnalyticsButtonProps){
    return(
        <button onClick={onClick}>
            <i className="fa-solid fa-chart-line"></i>
            <span>Analytics</span>
        </button>
    )
}