
import { EmbedBuilder, userMention } from "discord.js";

const CHANNEL_NAME = process.env.CHANNEL_NAME;

const event = {
  name: "guildMemberAdd",

  async execute(member) {
    const channel = member.guild.channels.cache.find(
      (channel) =>
        channel.name === CHANNEL_NAME &&
        channel.isTextBased() &&
        typeof channel.send === "function"
    );

    if (!channel) {
      console.error(`Channel "${CHANNEL_NAME}" not found.`);
      return;
    }

    const welcomeMessage = await getWelcomeMessageWithMeme(member.id);
    await channel.send(welcomeMessage);
  },
};

const getWelcomeMessageWithMeme = async (userId) => {
  const messages = [
    `Welcome ${userMention(userId)}! We are going to have so much fun`,
    `Hey ${userMention(userId)}! You made it👋`,
    `Everyone, say welcome to ${userMention(userId)}! 🎊`,
  ];

  const randomMessage =
    messages[Math.floor(Math.random() * messages.length)];

  const meme = getMeme();

  return {
    content: randomMessage,
    embeds: [meme],
  };
};

const getMeme = () => {
  const memeUrls = [
    "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
    "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif",
    "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif",
  ];

  const randomIndex = Math.floor(Math.random() * memeUrls.length);

  return new EmbedBuilder().setImage(memeUrls[randomIndex]);
};

export default event;
