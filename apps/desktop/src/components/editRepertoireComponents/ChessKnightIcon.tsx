/*apps/src/desktop/components/editRepertoireComponents/ChessKnightIcon.tsx*/

import styles from "./ChessKnightIcon.module.css";
import knightIcon from "../../assets/icons/044-knight.png";

export function ChessKnightIcon({ color }: { color: "white" | "black" }) {
  const isWhite = color === "white";

  return (
    <div className={`${styles.knightIcon} ${isWhite ? styles.knightWhite : styles.knightBlack}`}>
      <img alt="" src={knightIcon} className={styles.knightPiece} />
    </div>
  );
}
