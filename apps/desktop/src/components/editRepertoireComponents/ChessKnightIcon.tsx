/*apps/src/desktop/components/editRepertoireComponents/ChessKnightIcon.tsx*/

import styles from "./ChessKnightIcon.module.css";

export function ChessKnightIcon({ color }: { color: "white" | "black" }) {
  const isWhite = color === "white";

  return (
    <div className={`${styles.icon} ${isWhite ? styles.white : styles.black}`}>
      <i className={`fa-solid fa-chess-queen ${styles.piece}`} />
    </div>
  );
}
