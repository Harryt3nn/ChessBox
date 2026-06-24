import React from "react";
export function HomeButton({
  onBack
}) {
  return <button onClick={onBack}>
            <i className="fa-solid fa-house"></i>
            <span>Home</span>
          </button>;
}
  