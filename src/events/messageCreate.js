
const event = {
  name: "messageCreate",

  async execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    const content = message.content.trim().toLowerCase();

    // Group commands
    if (content === "hello") {
      await message.reply("Hi! Welcome to our Discord server! 👋");
      return;
    }

    if (content === "ping") {
      await message.reply("Pong! 🏓");
      return;
    }

    if (content === "help") {
      await message.reply(
        "Available commands: hello, ping, help, /10+5, /10-5, /10*5, /10/5"
      );
      return;
    }

    // Calculator
    if (!content.startsWith("/")) return;

    const expression = content.slice(1).replace(/\s+/g, "");

    const match = expression.match(
      /^(-?\d+(?:\.\d+)?)([+\-*/])(-?\d+(?:\.\d+)?)$/
    );

    if (!match) {
      await message.reply("Invalid calculation. Example: /10+5");
      return;
    }

    const num1 = Number(match[1]);
    const operator = match[2];
    const num2 = Number(match[3]);

    const operators = {
      "+": (a, b) => a + b,
      "-": (a, b) => a - b,
      "*": (a, b) => a * b,
      "/": (a, b) => a / b,
    };

    if (operator === "/" && num2 === 0) {
      await message.reply("Cannot divide by zero");
      return;
    }

    const result = operators[operator](num1, num2);

    await message.reply(`${expression} = ${result}`);
  },
};

export default event;
