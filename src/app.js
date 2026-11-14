import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import { loadEvents } from "./helpers";
import path from "path";

const TOKEN = process.env.TOKEN;

const { Guilds, GuildMessages, MessageContent } =
  GatewayIntentBits;
const { User, Message, GuildMember, ThreadMember } = Partials;

const client = new Client({
  intents: [Guilds, GuildMessages, MessageContent],
  partials: [User, Message, GuildMember, ThreadMember],
});

client.events = new Collection();

loadEvents(client, path.join(__dirname, "events"));

client.login(TOKEN);
