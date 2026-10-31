import { Client, GatewayIntentBits } from "discord.js";
import event from "./messageCreate.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once("ready", () => console.log(`✅ ${client.user.tag} is online!`));
client.on(event.name, (...args) => event.execute(...args));

client.login("");
