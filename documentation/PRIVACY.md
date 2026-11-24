# Privacy notice

ChessBox is a personal project run by Harry Tennant. It is not a business and is not offered to the public. This notice says what the app stores, where, and what it sends over the network.

## On your computer

Everything you create in ChessBox stays on your computer, in `%APPDATA%/ChessBox/ChessBox-data/`:

- **Repertoires, folders and moves** (`folders.json`, `repertoires/`, `nodes.json`). Kept until you delete them. Deleting a repertoire also deletes its Novelty Finder results and WeakPoints history.
- **Imported games** (`games/<site>/<username>/`). Copies of public games from Lichess and Chess.com, including your opponents' usernames, ratings and the date each game was played. Kept until you delete the folder. There is no delete button for these yet.
- **Novelty Finder results and WeakPoints history** (`novelty/`, `weakpoints/`). Worked out from your games and repertoires. Novelty Finder results include each game's players (your opponents' usernames), result and date; WeakPoints keeps every drill you have answered.
- **Your sign-in token** (`auth.token`), encrypted by Windows. It lasts 3 days and is deleted when you sign out.

ChessBox does not use cookies, analytics, crash reporting or automatic updates.

## On the ChessBox server

The server only handles accounts. It runs on a Raspberry Pi and is meant to be reached only over a private Tailscale network. For each account it stores:

- your username and email address,
- your password, stored only as an Argon2id hash (the password itself is never stored),
- the Lichess and Chess.com usernames you link,
- when the account was created,
- a counter that signs out your other devices when you change your password.

These are kept until the account is deleted.

The server also keeps a log line for each request it receives, with your IP address and the address that was requested. Passwords and request bodies are not logged. For now these log lines are kept with no time limit.

There is no way to delete an account from inside the app yet. Until there is, ask Harry and it will be deleted by hand.

## What is sent over the network

- **To the ChessBox server:** your username, email and password when you register or sign in, your sign-in token with each request, and the site usernames you link.
- **To Lichess and Chess.com:** the username you are importing games for, when you import, sent from your computer, so they see your IP address as with any website. When you link an account, the ChessBox server also asks Lichess or Chess.com whether that username exists. That request comes from the server, so they see the server's IP address, not yours.

Nothing else leaves your computer. Stockfish runs on your machine.

## Credits and licences

- Stockfish is free software under the GNU General Public License v3. Its source is available at [github.com/official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish).
- The icons are Flaticon assets used under a Flaticon Premium licence. The licence files are in `apps/desktop/src/assets/licenses/`.
- The repertoire graph model and import format come from [chessgraph.net](https://chessgraph.net).
- Spaced repetition uses [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT).

ChessBox is not affiliated with or endorsed by Chess.com or Lichess.
