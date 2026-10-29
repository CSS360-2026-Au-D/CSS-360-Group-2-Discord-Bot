
import ollama from "ollama";

const AI_MODEL = "llama3.2:1b";

const event = {
  name: "messageCreate",

  async execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    const rawContent = message.content.trim();
    const content = rawContent.toLowerCase();

    // Hello command
    if (content === "hello") {
      await message.reply("Hi! Welcome to our Discord server! 👋");
      return;
    }

    // Ping command
    if (content === "ping") {
      await message.reply("Pong! 🏓");
      return;
    }

    // Help command
    if (content === "help") {
      await message.reply(
        "Available commands:\n" +
        "hello - Welcome message\n" +
        "ping - Check bot status\n" +
        "help - Show commands\n" +
        "/ai question - Ask AI\n" +
        "/similar song name - Recommend similar songs\n" +
        "/10+5 - Calculator (+, -, *, /)"
      );
      return;
    }

    // Similar Song Recommendation
    if (content === "/similar" || content.startsWith("/similar ")) {
      const song = rawContent.slice(8).trim();

      if (!song) {
        await message.reply(
          "Please enter a song name. Example: /similar Blinding Lights"
        );
        return;
      }

      try {
        await message.channel.sendTyping();

        const prompt = `
You are a knowledgeable music recommendation assistant.

The user wants songs similar to: "${song}".

Recommend exactly 5 real, existing songs.

Consider the following similarities:
- Music genre
- Mood and atmosphere
- Rhythm and energy
- Instrumentation
- Production style

For each song, provide:
1. Song title
2. Artist name
3. One short sentence explaining the similarity

Rules:
- Do not recommend the original song.
- Do not repeat any song.
- Avoid inventing songs or artists.
- Prefer well-known, verifiable releases.
- Keep the response concise.
- Use a numbered list.
- Do not add an introduction.
`;

        // Request recommendations from Ollama
        const stream = await ollama.chat({
          model: AI_MODEL,
          messages: [
            { role: "user", content: prompt }
          ],
          stream: true
        });

        let answer = "";

        // Collect streaming response
        for await (const part of stream) {
          answer += part.message?.content || "";
        }

        if (!answer.trim()) {
          await message.reply(
            "AI could not generate song recommendations."
          );
          return;
        }

        const replyText =
          `🎵 Similar songs to "${song}":\n\n${answer}`;

        // Send response in Discord-safe chunks
        for (let i = 0; i < replyText.length; i += 1900) {
          await message.channel.send(
            replyText.slice(i, i + 1900)
          );
        }

      } catch (error) {
        console.error("Similar song recommendation error:", error);

        try {
          await message.reply(
            "Sorry, I couldn't generate similar songs. Please try again."
          );
        } catch (replyError) {
          console.error("Discord reply error:", replyError);
        }
      }

      return;
    }

    // General AI command
    if (content === "/ai" || content.startsWith("/ai ")) {
      const question = rawContent.slice(3).trim();

      if (!question) {
        await message.reply(
          "Please enter a question. Example: /ai What is Python?"
        );
        return;
      }

      try {
        await message.channel.sendTyping();

        // Ask Ollama using streaming
        const stream = await ollama.chat({
          model: AI_MODEL,
          messages: [
            { role: "user", content: question }
          ],
          stream: true
        });

        let answer = "";

        // Collect AI response chunks
        for await (const part of stream) {
          answer += part.message?.content || "";
        }

        // Reply with AI response
        await message.reply(
          answer.slice(0, 1900) ||
          "AI returned an empty response."
        );

      } catch (error) {
        console.error("AI error:", error);

        try {
          await message.reply(
            "AI encountered an error! Please try again."
          );
        } catch (replyError) {
          console.error("Discord reply error:", replyError);
        }
      }

      return;
    }

    // Calculator command
    if (!content.startsWith("/")) return;

    const expression = content.slice(1).replace(/\s+/g, "");

    // Match arithmetic expression
    const match = expression.match(
      /^(-?\d+(?:\.\d+)?)([+\-*/])(-?\d+(?:\.\d+)?)$/
    );

    if (!match) {
      await message.reply(
        "Invalid calculation. Example: /10+5"
      );
      return;
    }

    const num1 = Number(match[1]);
    const operator = match[2];
    const num2 = Number(match[3]);

    const operators = {
      "+": (a, b) => a + b,
      "-": (a, b) => a - b,
      "*": (a, b) => a * b,
      "/": (a, b) => a / b
    };

    if (operator === "/" && num2 === 0) {
      await message.reply("Cannot divide by zero");
      return;
    }

    const result = operators[operator](num1, num2);

    await message.reply(`${expression} = ${result}`);
  }
};

export default event;
