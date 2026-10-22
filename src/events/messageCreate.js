
const event = {
  name: "messageCreate",

  async execute(message) {
    // Ignore messages sent by bots
    if (message.author.bot) return;

    const content = message.content.trim().toLowerCase();

    if (content === "hello") {
      await message.reply("Hi! Welcome to our Discord server! 👋");
    }

    if (content === "ping") {
      await message.reply("Pong! 🏓");
    }

    if (content === "help") {
      await message.reply(
        "Available commands: hello, ping, help"
      );
    }
  },
};

export default event;
