// /similar <song name>
// Asks Gemini for 5 songs similar to the one the user gives.

import { askGemini } from "../services/gemini.js";

const buildPrompt = (song) => `
You are a knowledgeable music recommendation assistant.

The user wants songs similar to: "${song}".

Recommend exactly 5 real, existing songs.

Consider:
- Music genre
- Mood and atmosphere
- Rhythm and energy
- Instrumentation
- Production style

For each recommendation, provide:
1. Song title
2. Artist name
3. One short sentence explaining the similarity

Rules:
- Do not recommend the original song.
- Do not repeat songs.
- Avoid inventing songs or artists.
- Prefer well-known, verifiable releases.
- Keep the response concise.
- Use a numbered list.
- Do not add an introduction.
`;

export default {
  name: "/similar",
  matches: (content) =>
    content === "/similar" || content.startsWith("/similar "),

  async execute(message, rawContent) {
    const song = rawContent.slice(8).trim();

    if (!song) {
      await message.reply(
        "Please enter a song name. Example: /similar Blinding Lights"
      );
      return;
    }

    try {
      await message.channel.sendTyping();

      const answer = await askGemini(buildPrompt(song));

      const replyText = `🎵 Similar songs to "${song}":\n\n${answer}`;

      for (let i = 0; i < replyText.length; i += 1900) {
        await message.channel.send(replyText.slice(i, i + 1900));
      }
    } catch (error) {
      console.error("Similar song error:", error);

      await message.reply(
        "Sorry, I couldn't generate similar songs. Please try again."
      );
    }
  },
};
