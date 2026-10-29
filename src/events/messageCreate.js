
import ollama from "ollama";

const event = {
  name: "messageCreate",

  async execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    const content = message.content.trim().toLowerCase();

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
        "Available commands: hello, ping, help, /10+5, /10-5, /10*5, /10/5, /ai question"
      );
      return;
    }

    // AI command
    if (content === "/ai" || content.startsWith("/ai ")) {
      const question = message.content.trim().slice(3).trim();

      if (!question) {
        await message.reply(
          "Please enter a question. Example: /ai What is Python?"
        );
        return;
      }

      try {
        // Show typing indicator
        await message.channel.sendTyping();

        // Ask Ollama using streaming
        const stream = await ollama.chat({
          model: "llama3.2:1b",
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

        // Send AI response to Discord
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
