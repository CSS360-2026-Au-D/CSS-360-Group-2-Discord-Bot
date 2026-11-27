// Basic text commands: hello, ping, help

const HELP_TEXT =
  "Available commands:\n" +
  "hello - Welcome message\n" +
  "ping - Check bot status\n" +
  "help - Show commands\n" +
  "/ai question - Ask Gemini AI\n" +
  "/similar song name - Recommend similar songs\n" +
  "/song song name - Search for a song and preview\n" +
  "/guess [genre] - Play Guess the Song\n" +
  "/leaderboard - Show Guess the Song scores";

const REPLIES = {
  hello: "Hi! Welcome to our Discord server! 👋",
  ping: "Pong! 🏓",
  help: HELP_TEXT,
};

export default {
  name: "basic",
  matches: (content) => content in REPLIES,

  async execute(message, rawContent) {
    const content = rawContent.toLowerCase();
    await message.reply(REPLIES[content]);
  },
};
