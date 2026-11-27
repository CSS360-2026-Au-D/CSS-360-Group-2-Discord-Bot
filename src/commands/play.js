// /play <song name>
// Finds a song preview on iTunes and plays it in a voice channel.

import axios from "axios";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
} from "@discordjs/voice";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const VOICE_CHANNEL_ID = "1559754789489877002"; // lounge main server
// const VOICE_CHANNEL_ID = "1559756462203474008"; // test server

async function playSong(message, track) {
  const channel = message.guild.channels.cache.get(VOICE_CHANNEL_ID);

  if (!channel || !channel.isVoiceBased()) {
    return message.reply("I couldn't find that voice channel!");
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  const player = createAudioPlayer();

  const ffmpeg = spawn(ffmpegPath, [
    "-i", track.previewUrl,
    "-f", "s16le",
    "-ar", "48000",
    "-ac", "2",
    "pipe:1",
  ]);

  ffmpeg.on("error", (error) => {
    console.error("FFmpeg error:", error);
  });

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw,
  });

  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    connection.destroy();
    ffmpeg.kill();
  });

  await message.reply(
    `🎵 Playing **${track.trackName}** by **${track.artistName}**!`
  );
}

export default {
  name: "/play",
  matches: (content) => content.startsWith("/play "),

  async execute(message, rawContent) {
    const songName = rawContent.slice(6).trim();

    if (!songName) {
      return message.reply("Please provide a song name!");
    }

    try {
      const response = await axios.get("https://itunes.apple.com/search", {
        params: {
          term: songName,
          entity: "song",
          limit: 1,
        },
      });

      const track = response.data.results?.[0];

      if (!track || !track.previewUrl) {
        return message.reply("Couldn't find a playable song!");
      }

      await playSong(message, track);
    } catch (error) {
      console.error(error);
      message.reply("Something went wrong while playing the song.");
    }
  },
};
