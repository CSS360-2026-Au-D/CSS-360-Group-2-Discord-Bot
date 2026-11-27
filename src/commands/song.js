// /song <song name>  or  /song <song> by <artist>
// Searches the iTunes Search API and replies with a song card and preview.

import axios from "axios";
import { EmbedBuilder } from "discord.js";

const searchITunes = async (term) => {
  const response = await axios.get("https://itunes.apple.com/search", {
    params: {
      term,
      entity: "song",
      limit: 1,
    },
    timeout: 10000,
  });

  return response.data.results?.[0];
};

export default {
  name: "/song",
  matches: (content) => content === "/song" || content.startsWith("/song "),

  async execute(message, rawContent) {
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

      let track = await searchITunes(searchTerm);

      if (!track && searchTerm !== song) {
        track = await searchITunes(song);
      }

      if (!track) {
        await message.reply(`No results found.`);
        return;
      }

      const coverArt = track.artworkUrl100?.replace("100x100", "600x600");

      const year = track.releaseDate
        ? track.releaseDate.slice(0, 4)
        : "Unknown";

      // Plain text reply so /saveFavorite can reply to it
      await message.reply(track.trackName + " by " + track.artistName);

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

      await message.reply("Sorry, I couldn't reach the music service.");
    }
  },
};
