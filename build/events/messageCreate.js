var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var messageCreate_exports = {};
__export(messageCreate_exports, {
  default: () => messageCreate_default
});
module.exports = __toCommonJS(messageCreate_exports);
var import_ollama = __toESM(require("ollama"));
var import_axios = __toESM(require("axios"));
var import_discord = require("discord.js");
var import_discord2 = require("discord.js");
var import_voice = require("@discordjs/voice");
const AI_MODEL = "llama3.2:1b";
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});
const event = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;
    const rawContent = message.content.trim();
    const content = rawContent.toLowerCase();
    if (content === "hello") {
      await message.reply("Hi! Welcome to our Discord server! \u{1F44B}");
      return;
    }
    if (content === "ping") {
      await message.reply("Pong! \u{1F3D3}");
      return;
    }
    if (content === "help") {
      await message.reply(
        "Available commands:\nhello - Welcome message\nping - Check bot status\nhelp - Show commands\n/ai question - Ask AI\n/similar song name - Recommend similar songs\n/10+5 - Calculator (+, -, *, /)"
      );
      return;
    }
    const LOUNGE_NAME = "lounge";
    const IDLE_LEAVE_MS = 3e4;
    const sessions = /* @__PURE__ */ new Map();
    if (content === "/song" || content.startsWith("/song ")) {
      const song = rawContent.slice(5).trim();
      if (!song) {
        await message.reply(
          "Please enter a song name. Example: /song Blinding Lights or /song Hello by Adele"
        );
        return;
      }
      try {
        await message.channel.sendTyping();
        const searchTerm = song.replace(/\s+by\s+/i, " ");
        const searchITunes = async (term) => {
          const response = await import_axios.default.get("https://itunes.apple.com/search", {
            params: { term, entity: "song", limit: 1 },
            timeout: 1e4
          });
          return response.data.results[0];
        };
        let track2 = await searchITunes(searchTerm);
        if (!track2 && searchTerm !== song) {
          track2 = await searchITunes(song);
        }
        if (!track2) {
          await message.reply(`No results found for "${song}". Try another song name.`);
          return;
        }
        const coverArt = track2.artworkUrl100?.replace("100x100", "600x600");
        const year = track2.releaseDate ? track2.releaseDate.slice(0, 4) : "Unknown";
        const card = new import_discord2.EmbedBuilder().setColor(1947988).setTitle(track2.trackName).setURL(track2.trackViewUrl).setDescription(`by **${track2.artistName}**`).addFields(
          // inline: true puts these three fields side by side
          { name: "Album", value: track2.collectionName || "Unknown", inline: true },
          { name: "Released", value: year, inline: true },
          { name: "Genre", value: track2.primaryGenreName || "Unknown", inline: true }
        ).setImage(coverArt).setFooter({ text: "\u{1F3A7} 30-second preview \u2022 Data from iTunes" });
        if (!track2.previewUrl) {
          await message.reply({ embeds: [card] });
          return;
        }
        try {
          await message.reply({
            embeds: [card],
            files: [{ attachment: track2.previewUrl, name: "preview.m4a" }]
          });
        } catch (fileError) {
          console.error("Preview attachment error:", fileError);
          await message.reply({
            content: `\u25B6\uFE0F Preview: ${track2.previewUrl}`,
            embeds: [card]
          });
        }
      } catch (error) {
        console.error("Song lookup error:", error);
        try {
          await message.reply(
            "Sorry, I couldn't reach the music service. Please try again."
          );
        } catch (replyError) {
          console.error("Discord reply error:", replyError);
        }
      }
      return;
    }
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
        const stream = await import_ollama.default.chat({
          model: AI_MODEL,
          messages: [
            { role: "user", content: prompt }
          ],
          stream: true
        });
        let answer = "";
        for await (const part of stream) {
          answer += part.message?.content || "";
        }
        if (!answer.trim()) {
          await message.reply(
            "AI could not generate song recommendations."
          );
          return;
        }
        const replyText = `\u{1F3B5} Similar songs to "${song}":

${answer}`;
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
        const stream = await import_ollama.default.chat({
          model: AI_MODEL,
          messages: [
            { role: "user", content: question }
          ],
          stream: true
        });
        let answer = "";
        for await (const part of stream) {
          answer += part.message?.content || "";
        }
        await message.reply(
          answer.slice(0, 1900) || "AI returned an empty response."
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
    const client2 = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
      ]
    });
    function getTargetChannel(message2) {
      const lounge = message2.guild.channels.cache.find(
        (c) => c.type === import_discord.ChannelType.GuildVoice && c.name.toLowerCase().includes(LOUNGE_NAME)
      );
      return lounge ?? message2.member?.voice?.channel ?? null;
    }
    function stopAndLeave(guildId) {
      const session = sessions.get(guildId);
      if (session) {
        clearTimeout(session.idleTimer);
        session.player.stop(true);
        sessions.delete(guildId);
      }
      const connection = (0, import_voice.getVoiceConnection)(guildId);
      if (connection && connection.state.status !== import_voice.VoiceConnectionStatus.Destroyed) {
        connection.destroy();
      }
      return Boolean(session || connection);
    }
    async function playPreview(message2, track2) {
      const { guild } = message2;
      if (!track2.previewUrl) {
        return { ok: false, reason: "That song has no audio preview available." };
      }
      const channel = getTargetChannel(message2);
      if (!channel) {
        return {
          ok: false,
          reason: 'I couldnt find a voice channel named "${LOUNGE_NAME}", and you are not in a voice channel.'
        };
      }
      const perms = channel.permissionsFor(guild.members.me);
      if (!perms?.has([
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak
      ])) {
        return {
          ok: false,
          reason: "I dont have permission to Connect and Speak in **${channel.name}**."
        };
      }
      let connection = (0, import_voice.getVoiceConnection)(guild.id);
      if (!connection || connection.joinConfig.channelId !== channel.id) {
        connection?.destroy();
        connection = (0, import_voice.joinVoiceChannel)({
          channelId: channel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
          selfDeaf: true
        });
        connection.on(import_voice.VoiceConnectionStatus.Disconnected, async () => {
          try {
            await Promise.race([
              (0, import_voice.entersState)(connection, import_voice.VoiceConnectionStatus.Signalling, 5e3),
              (0, import_voice.entersState)(connection, import_voice.VoiceConnectionStatus.Connecting, 5e3)
            ]);
          } catch {
            stopAndLeave(guild.id);
          }
        });
      }
      try {
        await (0, import_voice.entersState)(connection, import_voice.VoiceConnectionStatus.Ready, 15e3);
      } catch (error) {
        console.error("Voice connection error:", error);
        stopAndLeave(guild.id);
        return { ok: false, reason: "I couldn't connect to the voice channel." };
      }
      let session = sessions.get(guild.id);
      if (!session) {
        const player = (0, import_voice.createAudioPlayer)({
          behaviors: { noSubscriber: import_voice.NoSubscriberBehavior.Pause }
        });
        session = { player, idleTimer: null };
        sessions.set(guild.id, session);
        player.on("error", (error) => {
          console.error("Audio player error:", error);
        });
        player.on(import_voice.AudioPlayerStatus.Idle, () => {
          clearTimeout(session.idleTimer);
          session.idleTimer = setTimeout(
            () => stopAndLeave(guild.id),
            IDLE_LEAVE_MS
          );
        });
      }
      clearTimeout(session.idleTimer);
      connection.subscribe(session.player);
      const resource = (0, import_voice.createAudioResource)(track2.previewUrl);
      session.player.play(resource);
      return { ok: true, channelName: channel.name };
    }
    if (content === "/play" || content.startsWith("/play ")) {
      const song = rawContent.slice(5).trim();
      if (!message.guild) {
        await message.reply("This command only works in a server.");
        return;
      }
      if (!song) {
        await message.reply(
          "Please enter a song name. Example: /play Blinding Lights or /play Hello by Adele"
        );
        return;
      }
      try {
        await message.channel.sendTyping();
        if (!song) {
          await message.reply('No results found for "${song}". Try another song name.');
          return;
        }
        const result2 = await playPreview(message, track);
        if (!result2.ok) {
          await message.reply(result2.reason);
          return;
        }
        await message.reply(
          `\u{1F3B6} Now playing a 30-second preview of **${track.trackName}** by **${track.artistName}** in **${result2.channelName}**`
        );
      } catch (error) {
        console.error("Play error:", error);
        try {
          await message.reply("Sorry, I couldn't play that song. Please try again.");
        } catch (replyError) {
          console.error("Discord reply error:", replyError);
        }
      }
      return;
    }
    if (content === "/stop") {
      const left = stopAndLeave(message.guild?.id);
      await message.reply(left ? "\u23F9\uFE0F Stopped and left the voice channel." : "I'm not playing anything.");
      return;
    }
    if (!content.startsWith("/")) return;
    const expression = content.slice(1).replace(/\s+/g, "");
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
var messageCreate_default = event;
