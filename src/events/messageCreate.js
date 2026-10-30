
import ollama from "ollama";
import axios from "axios";
import { EmbedBuilder } from "discord.js";

const AI_MODEL = "llama3.2:1b";

const event = {
  name: "messageCreate",

  async execute(message) {
    // Ignore bot messages
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
        "/ai question - Ask AI\n" +
        "/similar song name - Recommend similar songs\n" +
        "/10+5 - Calculator (+, -, *, /)"
      );
      return;
    }

        // ============================================================
    // Song Preview Card  (/song <song name>  or  /song <song> by <artist>)
    // User story: As a server member, I want to search for a song
    // and get a card with its details, cover art, and a playable
    // preview so I can check out music without leaving Discord.
    //
    // Data source: iTunes Search API (free, no API key needed).
    // Unlike /ai and /similar, this does NOT depend on Ollama.
    // ============================================================
    // Matches "/song" exactly or "/song <name>".
    // (Using "/song " with a space so "/songs" doesn't trigger it.)
    if (content === "/song" || content.startsWith("/song ")) {
      // Take everything after "/song" (5 characters).
      // Uses rawContent (not lowercased) to keep the user's capitalization.
      const song = rawContent.slice(5).trim();

      // No song name given: show how to use the command
      if (!song) {
        await message.reply(
          "Please enter a song name. Example: /song Blinding Lights or /song Hello by Adele"
        );
        return;
      }

      try {
        // Shows "Bot is typing..." while we wait for the API
        await message.channel.sendTyping();

        // Let users search "Song by Artist" (e.g. "/song Hello by Adele").
        // iTunes matches title + artist together, so we drop the word "by".
        // \s+by\s+ only matches "by" as its own word, so "Baby" is safe.
        const searchTerm = song.replace(/\s+by\s+/i, " ");

        // Asks iTunes for the top matching song.
        // Passing the search as `params` lets axios URL-encode it,
        // so spaces and apostrophes (e.g. "Don't Stop Me Now") work.
        // The 10s timeout keeps the bot from hanging if iTunes is slow.
        const searchITunes = async (term) => {
          const response = await axios.get("https://itunes.apple.com/search", {
            params: { term, entity: "song", limit: 1 },
            timeout: 10000
          });
          // iTunes returns { resultCount, results: [...] }; take the first match
          return response.data.results[0];
        };

        let track = await searchITunes(searchTerm);

        // If dropping "by" found nothing, retry with the exact text.
        // This covers titles that really contain "by" (e.g. "Stand by Me").
        if (!track && searchTerm !== song) {
          track = await searchITunes(song);
        }

        // Still no matches: tell the user instead of crashing
        if (!track) {
          await message.reply(`No results found for "${song}". Try another song name.`);
          return;
        }

        // iTunes only gives a 100x100 thumbnail URL, but the same URL
        // with "600x600" returns a high-resolution cover image
        const coverArt = track.artworkUrl100?.replace("100x100", "600x600");

        // releaseDate looks like "2019-11-29T12:00:00Z"; keep just the year
        const year = track.releaseDate ? track.releaseDate.slice(0, 4) : "Unknown";

        // Build the song card (Discord embed)
        const card = new EmbedBuilder()
          .setColor(0x1db954)                         // green accent bar on the card
          .setTitle(track.trackName)                  // song title
          .setURL(track.trackViewUrl)                 // clicking the title opens the song on Apple Music
          .setDescription(`by **${track.artistName}**`)
          .addFields(
            // inline: true puts these three fields side by side
            { name: "Album", value: track.collectionName || "Unknown", inline: true },
            { name: "Released", value: year, inline: true },
            { name: "Genre", value: track.primaryGenreName || "Unknown", inline: true }
          )
          .setImage(coverArt)                         // large album cover
          .setFooter({ text: "🎧 30-second preview • Data from iTunes" });

        // Some songs have no preview available; send just the card
        if (!track.previewUrl) {
          await message.reply({ embeds: [card] });
          return;
        }

        // Attach the 30-second preview as an audio file.
        // Discord shows its built-in player (play/pause + seek bar) for it.
        try {
          await message.reply({
            embeds: [card],
            files: [{ attachment: track.previewUrl, name: "preview.m4a" }]
          });
        } catch (fileError) {
          // If the file can't be attached, still send the card
          // with a clickable preview link instead
          console.error("Preview attachment error:", fileError);
          await message.reply({
            content: `▶️ Preview: ${track.previewUrl}`,
            embeds: [card]
          });
        }

      } catch (error) {
        // API request failed (network error, timeout, iTunes down, etc.)
        console.error("Song lookup error:", error);

        // Nested try so a failed error reply can't crash the bot
        try {
          await message.reply(
            "Sorry, I couldn't reach the music service. Please try again."
          );
        } catch (replyError) {
          console.error("Discord reply error:", replyError);
        }
      }

      // Stop here so the calculator below doesn't treat "/song" as math
      return;
    }

    // Similar Song Recommendation
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

        // Request recommendations from Ollama
        const stream = await ollama.chat({
          model: AI_MODEL,
          messages: [
            { role: "user", content: prompt }
          ],
          stream: true
        });

        let answer = "";

        // Collect streaming response
        for await (const part of stream) {
          answer += part.message?.content || "";
        }

        if (!answer.trim()) {
          await message.reply(
            "AI could not generate song recommendations."
          );
          return;
        }

        const replyText =
          `🎵 Similar songs to "${song}":\n\n${answer}`;

        // Send response in Discord-safe chunks
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

    // General AI command
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

        // Ask Ollama using streaming
        const stream = await ollama.chat({
          model: AI_MODEL,
          messages: [
            { role: "user", content: question }
          ],
          stream: true
        });

        let answer = "";

        // Collect AI response chunks
        for await (const part of stream) {
          answer += part.message?.content || "";
        }

        // Reply with AI response
        await message.reply(
          answer.slice(0, 1900) ||
          "AI returned an empty response."
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

    // Calculator command
    if (!content.startsWith("/")) return;

    const expression = content.slice(1).replace(/\s+/g, "");

    // Match arithmetic expression
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

export default event;
