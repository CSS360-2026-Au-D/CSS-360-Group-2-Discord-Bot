var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var guildMemberAdd_exports = {};
__export(guildMemberAdd_exports, {
  default: () => guildMemberAdd_default
});
module.exports = __toCommonJS(guildMemberAdd_exports);
var import_discord = require("discord.js");
const CHANNEL_NAME = process.env.CHANNEL_NAME;
const event = {
  name: "guildMemberAdd",
  async execute(member) {
    const channel = member.guild.channels.cache.find(
      (channel2) => channel2.name === CHANNEL_NAME && channel2.isTextBased() && typeof channel2.send === "function"
    );
    if (!channel) {
      console.error(`Channel "${CHANNEL_NAME}" not found.`);
      return;
    }
    const welcomeMessage = await getWelcomeMessageWithMeme(member.id);
    await channel.send(welcomeMessage);
  }
};
const getWelcomeMessageWithMeme = async (userId) => {
  const messages = [
    `Welcome ${(0, import_discord.userMention)(userId)}! \u{1F389} Enjoy your stay!`,
    `Hey ${(0, import_discord.userMention)(userId)}! Welcome to our awesome server! \u{1F44B}`,
    `Everyone say hello to ${(0, import_discord.userMention)(userId)}! \u{1F38A}`
  ];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  const meme = getMeme();
  return {
    content: randomMessage,
    embeds: [meme]
  };
};
const getMeme = () => {
  const memeUrls = [
    "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
    "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif",
    "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif"
  ];
  const randomIndex = Math.floor(Math.random() * memeUrls.length);
  return new import_discord.EmbedBuilder().setImage(memeUrls[randomIndex]);
};
var guildMemberAdd_default = event;
