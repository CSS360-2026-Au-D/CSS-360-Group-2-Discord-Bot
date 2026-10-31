
main
import { askGemini } from "../services/gemini.js";
import axios from "axios";
import { EmbedBuilder } from "discord.js";

const VOICE_CHANNEL_ID = "1559754789489877002"; //this is for lounge main server
// const VOICE_CHANNEL_ID = "1559756462203474008";   //this is for test server

// for the music bot to play music
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType
} from "@discordjs/voice";

import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";



const event = {
  name: "messageCreate",

  async execute(message) {
    // Ignore messages from bots
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
        "/ai question - Ask Gemini AI\n" +
        "/similar song name - Recommend similar songs\n" +
        "/song song name - Search for a song and preview"
      );
      return;
    }

    // ==================================================
    // Song Search (/song)
    // Uses the iTunes Search API
    // ==================================================
    if (content === "/song" || content.startsWith("/song ")) {
      const song = rawContent.slice(5).trim();

      if (!song) {
        await message.reply(
          "Please enter a song name. Example: /song Blinding Lights"
        );
        return;
      }

      try {
        await message.channel.sendTyping();

        const searchTerm = song.replace(/\s+by\s+/i, " ");

        const searchITunes = async (term) => {
          const response = await axios.get(
            "https://itunes.apple.com/search",
            {
              params: {
                term,
                entity: "song",
                limit: 1,
              },
              timeout: 10000,
            }
          );

          return response.data.results?.[0];
        };

        let track = await searchITunes(searchTerm);

        if (!track && searchTerm !== song) {
          track = await searchITunes(song);
        }

        if (!track) {
          await message.reply(
            `No results found for "${song}".`
          );
          return;
        }

        const coverArt = track.artworkUrl100
          ?.replace("100x100", "600x600");

        const year = track.releaseDate
          ? track.releaseDate.slice(0, 4)
          : "Unknown";

        await message.reply(track.trackName +" by " +track.artistName);

        const card = new EmbedBuilder()
          .setColor(0x1db954)
          .setTitle(track.trackName)
          .setDescription(`by **${track.artistName}**`)
          .addFields(
            {
              name: "Album",
              value: track.collectionName || "Unknown",
              inline: true,
            },
            {
              name: "Released",
              value: year,
              inline: true,
            },
            {
              name: "Genre",
              value: track.primaryGenreName || "Unknown",
              inline: true,
            }
          )
          .setFooter({
            text: "🎧 30-second preview • Data from iTunes",
          });

        if (track.trackViewUrl) {
          card.setURL(track.trackViewUrl);
        }

        if (coverArt) {
          card.setImage(coverArt);
        }

        if (!track.previewUrl) {
          await message.reply({ embeds: [card] });
          return;
        }

        try {
          await message.reply({
            embeds: [card],
            files: [
              {
                attachment: track.previewUrl,
                name: "preview.m4a",
              },
            ],
          });
        } catch (fileError) {
          console.error("Preview attachment error:", fileError);

          await message.reply({
            content: `▶️ Preview: ${track.previewUrl}`,
            embeds: [card],
          });
        }
      } catch (error) {
        console.error("Song lookup error:", error);

        await message.reply(
          "Sorry, I couldn't reach the music service."
        );
      }

      return;
    }
    
    // ==================
    // AI Voice channel play song feature
    if (content.startsWith("/play ")) {
        const songName = rawContent.slice(6).trim();

        if (!songName) {
            return message.reply("Please provide a song name!");
        }

        try {
            const response = await axios.get(
            "https://itunes.apple.com/search",
            {
                params: {
                term: songName,
                entity: "song",
                limit: 1
                }
            }
            );

            const track = response.data.results?.[0];

            if (!track || !track.previewUrl) {
            return message.reply("Couldn't find a playable song!");
            }

            await playSong(message, track);

        } catch (error) {
            console.error(error);
            message.reply("Something went wrong while playing the song.");
        }

    }


    // Helper function to playSong
    
    async function playSong(message, track) {
    const channel = message.guild.channels.cache.get(VOICE_CHANNEL_ID);

    if (!channel || !channel.isVoiceBased()) {
        return message.reply("I couldn't find that voice channel!");
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true
    });

    const player = createAudioPlayer();

    const ffmpeg = spawn(ffmpegPath, [
        "-i", track.previewUrl,
        "-f", "s16le",
        "-ar", "48000",
        "-ac", "2",
        "pipe:1"
    ]);

    ffmpeg.on("error", (error) => {
        console.error("FFmpeg error:", error);
    });

    const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw
    });

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
        ffmpeg.kill();
    });

    await message.reply(`🎵 Playing **${track.trackName}** by **${track.artistName}**!`);
    }


    //jack part
    // ==================================================
    // Similar Song Recommendation (/similar)
    // Uses Google Gemini API
    // ==================================================
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

Consider:
- Music genre
- Mood and atmosphere
- Rhythm and energy
- Instrumentation
- Production style

For each recommendation, provide:
1. Song title
2. Artist name
3. One short sentence explaining the similarity

Rules:
- Do not recommend the original song.
- Do not repeat songs.
- Avoid inventing songs or artists.
- Prefer well-known, verifiable releases.
- Keep the response concise.
- Use a numbered list.
- Do not add an introduction.
`;

        const answer = await askGemini(prompt);

        const replyText =
          `🎵 Similar songs to "${song}":\n\n${answer}`;

        for (let i = 0; i < replyText.length; i += 1900) {
          await message.channel.send(
            replyText.slice(i, i + 1900)
          );
        }
      } catch (error) {
        console.error("Similar song error:", error);

        await message.reply(
          "Sorry, I couldn't generate similar songs. Please try again."
        );
      }

      return;
    }


    // ==================================================
    // General AI Chat (/ai)
    // Uses Google Gemini API
    // ==================================================
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

      return;
    }
  },
};

export default event;
