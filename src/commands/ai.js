// /ai <question>
// Sends the question to Gemini and replies with the answer.

import { askGemini } from "../services/gemini.js";

export default {
  name: "/ai",
  matches: (content) => content === "/ai" || content.startsWith("/ai "),

  async execute(message, rawContent) {
    const question = rawContent.slice(3).trim();

    if (!question) {
      await message.reply(
        "Please enter a question. Example: /ai What is Python?"
      );
      return;
    }

    try {
      await message.channel.sendTyping();

      const answer = await askGemini(question);

      // Split long responses into Discord-safe chunks
      for (let i = 0; i < answer.length; i += 1900) {
        const chunk = answer.slice(i, i + 1900);

        if (i === 0) {
          await message.reply(chunk);
        } else {
          await message.channel.send(chunk);
        }
      }
    } catch (error) {
      console.error("Gemini AI error:", error);

      await message.reply(
        "Sorry, the AI service is temporarily unavailable."
      );
    }
  },
};
