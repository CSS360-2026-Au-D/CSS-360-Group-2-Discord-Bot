// /play <song name>
// Finds a song preview on iTunes and plays it in a voice channel.

import axios from "axios";
import { PermissionFlagsBits } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
  entersState,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const VOICE_CHANNEL_NAME = "lounge";

async function playSong(message, track) {
  let previewAudio;
  try {
    const response = await axios.get(track.previewUrl, {
      responseType: "arraybuffer",
      timeout: 15_000,
    });
    previewAudio = Buffer.from(response.data);
  } catch (error) {
    console.error("Failed to download song preview:", error);
    return message.reply("I couldn't download the song preview.");
  }

  const isLoungeVoiceChannel = (candidate) =>
    candidate.isVoiceBased() &&
    candidate.name.toLowerCase() === VOICE_CHANNEL_NAME;
  let channel = message.guild.channels.cache.find(isLoungeVoiceChannel);

  if (!channel) {
    try {
      const channels = await message.guild.channels.fetch();
      channel = channels.find(isLoungeVoiceChannel);
    } catch (error) {
      console.error("Failed to fetch guild channels while looking for Lounge:", error);
      return message.reply(
        "I couldn't look up the Lounge voice channel. Check that the bot can access this server."
      );
    }
  }

  if (!channel) {
    return message.reply(
      "I couldn't find a voice channel named \"Lounge\" in this server."
    );
  }

  const botMember = message.guild.members.me;
  if (
    botMember &&
    !botMember.permissionsIn(channel).has([
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ])
  ) {
    return message.reply(
      "I need Connect and Speak permissions in the Lounge voice channel to play audio."
    );
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
  });
  const player = createAudioPlayer();
  let ffmpeg;
  let ffmpegStderr = "";
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    connection.destroy();
    if (ffmpeg && ffmpeg.exitCode === null && ffmpeg.signalCode === null) {
      ffmpeg.kill();
    }
  };

  connection.subscribe(player);
  player.once(AudioPlayerStatus.Idle, cleanup);
  player.on("error", (error) => {
    console.error("Audio player error:", error);
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

    ffmpeg = spawn(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-i", "pipe:0",
      "-vn",
      "-f", "s16le",
      "-ar", "48000",
      "-ac", "2",
      "pipe:1",
    ]);

    ffmpeg.stderr.setEncoding("utf8");
    ffmpeg.stderr.on("data", (chunk) => {
      ffmpegStderr = (ffmpegStderr + chunk).slice(-4000);
    });
    ffmpeg.on("error", (error) => {
      console.error("FFmpeg process error:", error);
    });
    ffmpeg.stdin.on("error", (error) => {
      if (error.code !== "EPIPE") {
        console.error("Failed to send preview audio to FFmpeg:", error);
      }
    });
    ffmpeg.on("close", (code, signal) => {
      if (code !== 0 && signal !== "SIGTERM") {
        console.error("FFmpeg exited unexpectedly:", {
          code,
          signal,
          stderr: ffmpegStderr.trim(),
        });
      }
    });

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw,
    });
    player.play(resource);
    ffmpeg.stdin.end(previewAudio);

    await entersState(player, AudioPlayerStatus.Playing, 15_000);
    await message.reply(
      `🎵 Playing **${track.trackName}** by **${track.artistName}**!`
    );
  } catch (error) {
    console.error("Failed to start song playback:", error, ffmpegStderr.trim());
    cleanup();
    return message.reply(
      "I couldn't start playback. Check the bot logs for the audio error."
    );
  }
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
