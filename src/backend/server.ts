import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3001;

app.get("/api/chesscom/:username", async (req, res) => {
  const username = req.params.username.toLowerCase();

  try {
    const response = await fetch(
      `https://api.chess.com/pub/player/${username}`,
      {
        headers: {
          "User-Agent": "CTTBox/1.0 (https://github.com/Harryt3nn)"
        }
      }
    );

    if (!response.ok) {
      return res.status(404).json({ error: "User not found" });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Chess.com fetch error:", err);
    res.status(500).json({ error: "Failed to reach Chess.com API" });
  }
});

app.listen(PORT, () => {
  console.log(`CTT backend running at http://localhost:${PORT}`);
});