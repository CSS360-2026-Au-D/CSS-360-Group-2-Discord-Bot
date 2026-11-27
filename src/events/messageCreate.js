
// messageCreate only routes messages.
// Each command lives in its own file in src/commands/.

import commands from "../commands/index.js";
import favoriteSong from "./favorite-song.js";
import guessGame, { isPlayingGuessGame } from "./guess-game.js";

const event = {
  name: "messageCreate",

  async execute(message) {
    // Ignore messages from bots
    if (message.author.bot) return;

    // If this person is in the middle of /guess, their message is a guess,
    // not a command, so don't run it as "ping", "help", etc.
    if (isPlayingGuessGame(message)) return;

    // Run Guess the Song (/guess, /leaderboard)
    await guessGame.execute(message);

    // Run favorite song feature (/saveFavorite, /viewFavorites)
    await favoriteSong.execute(message);

    const rawContent = message.content.trim();
    const content = rawContent.toLowerCase();

    // Find the first command that matches and run it
    const command = commands.find((cmd) => cmd.matches(content));

    if (command) {
      await command.execute(message, rawContent);
    }
  },
};

export default event;
