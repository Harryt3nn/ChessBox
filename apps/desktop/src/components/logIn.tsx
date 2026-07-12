/*apps/desktop/src/components/logIn.tsx*/


import blacklist from "../../config/blacklist.json"


const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,20}$/;
const PASSWORD_REGEX = /^.{8,64}$/;

const combined = [
  ...blacklist.system,
  ...blacklist.app,
  ...blacklist.chess
].map(w => w.toLowerCase());

export function LogIn() {
  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        <h2>Sign into ChessBox</h2>

       <input
        type="text"
        name="username"
        minLength={3}
        maxLength={20}
        pattern="^[A-Za-z0-9_-]+$"
        required
        />

       <input
        type="text"
        name="password"
        minLength={8}
        maxLength={64}
        pattern="^[A-Za-z0-9_-]+$"
        required
        />

      </div>
    </div>
  );
}
