// ==================================================
// Guess the Song (/guess) and scores (/leaderboard)
//
// HOW THE GAME WORKS
// The player picks a genre with buttons (or types it: "/guess rock").
// Then they get 3 guesses. Every wrong guess unlocks a bigger hint:
//   Guess 1: 10 seconds of the song                              -> 3 points
//   Guess 2: 20 seconds + a blurred album cover                  -> 2 points
//   Guess 3: 30 seconds + the blurred cover + the artist's name  -> 1 point
// After 3 wrong guesses the bot reveals the answer.
//
// WHAT IT USES
// - iTunes Search API to find a random song (same API as /song)
// - ffmpeg to cut the audio and blur the cover (same tool as /play)
// No new packages are needed.
//
// HOW THE CODE IS ORGANIZED (top to bottom)
// 1. Settings           - the rounds, timers, genres, and spam limits
// 2. Game memory        - who is playing where, and everyone's scores
// 3. Checking guesses   - deciding if a guess matches the title
// 4. Making the hints   - asking for a genre, picking a song, cutting audio, blurring the cover
// 5. The game itself    - playing the 3 rounds
// 6. The leaderboard    - showing the top scores
// 7. The event          - what messageCreate.js calls for every message
// ==================================================

import axios from "axios"; // makes web requests (to iTunes)
import { spawn } from "child_process"; // runs another program (ffmpeg)
import ffmpegPath from "ffmpeg-static"; // where the ffmpeg program is installed
import {
  ActionRowBuilder, // a row of buttons
  AttachmentBuilder, // a file to send (the clip or the cover)
  ButtonBuilder, // one button
  ButtonStyle, // button colors
  EmbedBuilder, // the cards the bot sends
  MessageFlags, // used to send a message only one person can see
} from "discord.js";

// ==================================================
// 1. Settings
// ==================================================

// One entry per guess. To change the game (more rounds, longer clips,
// different points), you only need to edit this list.
const ROUNDS = [
  { seconds: 10, points: 3, showCover: false, showArtist: false }, // guess 1
  { seconds: 20, points: 2, showCover: true, showArtist: false }, // guess 2
  { seconds: 30, points: 1, showCover: true, showArtist: true }, // guess 3
];

// How long the player has to type each guess (30,000 ms = 30 seconds).
const GUESS_TIME_MS = 30_000;

// How long the player has to click a genre button (30 seconds).
const PICK_TIME_MS = 30_000;

// The genre buttons. "value" is what we search iTunes for.
// To add a genre, just add a line here.
const GENRES = [
  { label: "Pop", value: "pop", emoji: "🎤" },
  { label: "Rock", value: "rock", emoji: "🎸" },
  { label: "Hip Hop", value: "hip hop", emoji: "🎧" },
  { label: "R&B", value: "r&b", emoji: "💜" },
  { label: "Country", value: "country", emoji: "🤠" },
  { label: "Dance", value: "dance", emoji: "💃" },
  { label: "Indie", value: "indie", emoji: "🌿" },
  { label: "K-Pop", value: "k-pop", emoji: "✨" },
];

// The extra "Surprise me" button picks one of the genres above at random.
const RANDOM = "random";

// Limits that stop people from spamming /guess and slowing down the bot.
// (Each game runs ffmpeg several times, which uses a lot of computer power.)
const MAX_GAMES_AT_ONCE = 5; // across the whole bot
const COOLDOWN_MS = 5_000; // a player must wait 5 seconds between games

// ==================================================
// 2. Game memory
// These are kept in memory, so they reset when the bot restarts
// (the same way favorite songs work right now).
// ==================================================

// Which channels have a game running, and who is playing in each one.
// Example: Map { "channel-123" => "user-456" }
// Only one game is allowed per channel at a time.
const activeGames = new Map();

// Each player's total points.
// Example: Map { "user-456" => 7 }
const scores = new Map();

// When each player's last game ended (used for the cooldown).
// Example: Map { "user-456" => 1732400000000 }  (a time in milliseconds)
const lastPlayed = new Map();

// ==================================================
// 3. Checking guesses
// ==================================================

// Cleans up a song title so small differences don't matter.
// Example: "Levitating (feat. DaBaby)" and "LEVITATING!" both become "levitating".
export function normalizeTitle(text) {
  return text
    .toLowerCase() // "Hello" -> "hello"
    .normalize("NFD") // split letters from their accents
    .replace(/[\u0300-\u036f]/g, "") // then drop the accents: "café" -> "cafe"
    .replace(/\(.*?\)|\[.*?\]/g, "") // remove anything in brackets: "(feat. X)", "[Live]"
    .replace(/\s-\s.*$/, "") // remove endings like " - Remastered 2011"
    .replace(/&/g, "and") // "Rock & Roll" -> "rock and roll"
    .replace(/[^\p{L}\p{N}\s]/gu, "") // remove punctuation, but keep letters from any language
    .replace(/\s+/g, " ") // turn double spaces into single spaces
    .trim(); // remove spaces at the start and end
}

// Returns true if the guess matches the song title (after cleaning both).
export function isCorrectGuess(guess, title) {
  const answer = normalizeTitle(title);

  // If the title is empty after cleaning (e.g. the whole title was "(Intro)"),
  // nothing should count as correct.
  if (!answer) return false;

  return normalizeTitle(guess) === answer;
}

// Returns true if this message was sent by the person currently playing
// in this channel. messageCreate.js uses this so that a guess like "ping"
// or "help" is NOT also run as a normal bot command.
export function isPlayingGuessGame(message) {
  const playerId = activeGames.get(message.channel?.id);

  // "playerId !== undefined" makes sure a game is actually running here.
  // Without it, a message with no user ID would wrongly count as "playing".
  return playerId !== undefined && playerId === message.author?.id;
}

// Discord rejects embeds with very long text (titles max 256 characters),
// so this cuts long names and adds "…" at the end.
function shorten(text, max) {
  if (!text) return "Unknown";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Returns true only for normal "https://" web links.
// ffmpeg can also open files on the bot's computer, so we never hand it
// anything else, even though the links come from iTunes.
export function isSafeUrl(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false; // not a valid link at all
  }
}

// ==================================================
// 4. Making the hints
// ==================================================

// Builds the genre buttons. Discord allows at most 5 buttons per row,
// so we split them into rows of 5.
function genreButtons() {
  const choices = [...GENRES, { label: "Surprise me", value: RANDOM, emoji: "🎲" }];

  const buttons = choices.map((choice) =>
    new ButtonBuilder()
      .setCustomId(`guess-genre:${choice.value}`) // tells us which button was clicked
      .setLabel(choice.label)
      .setEmoji(choice.emoji)
      .setStyle(choice.value === RANDOM ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  return rows;
}

// Asks the player to pick a genre with buttons.
// Returns the genre (e.g. "rock"), RANDOM, or null if they didn't pick in time.
async function askForGenre(message) {
  const prompt = await message.reply({
    content: "🎶 **Guess the Song!** Pick a genre:",
    components: genreButtons(),
  });

  let click;
  try {
    // Wait for a button click on this message.
    click = await prompt.awaitMessageComponent({
      // Only the player's click counts. Anyone else gets a private note.
      filter: async (interaction) => {
        if (interaction.user.id === message.author.id) return true;
        await interaction
          .reply({
            content: "This isn't your game! Start your own with /guess.",
            flags: MessageFlags.Ephemeral, // only they can see this
          })
          .catch(() => {});
        return false;
      },
      time: PICK_TIME_MS,
    });
  } catch {
    // awaitMessageComponent throws an error when time runs out.
    await prompt
      .edit({ content: "⏰ No genre picked, so the game was cancelled.", components: [] })
      .catch(() => {});
    return null;
  }

  // "guess-genre:rock" -> "rock"
  const genre = click.customId.slice("guess-genre:".length);
  const label = GENRES.find((g) => g.value === genre)?.label || "Surprise me 🎲";

  // Replace the buttons with the choice, so nobody can click them again.
  await click.update({ content: `🎶 Genre: **${label}**`, components: [] });
  return genre;
}

// Searches iTunes and returns one random song (or null if none were found).
async function pickRandomTrack(genre) {
  // Use the genre the player chose, or pick a random one for "Surprise me".
  const term =
    genre === RANDOM
      ? GENRES[Math.floor(Math.random() * GENRES.length)].value
      : genre;

  const response = await axios.get("https://itunes.apple.com/search", {
    params: {
      term: term.slice(0, 100), // keep the search short, in case someone types an essay
      entity: "song",
      limit: 50, // get 50 songs so we have plenty to pick from
      explicit: "No", // no explicit songs (this is a class server)
    },
    timeout: 10_000, // give up after 10 seconds if iTunes doesn't answer
  });

  // Some songs are missing a preview or a cover. We can't use those,
  // so keep only the songs that have everything the game needs.
  const playable = (response.data.results || []).filter(
    (track) =>
      isSafeUrl(track.previewUrl) && // audio to play, as a safe https link
      isSafeUrl(track.artworkUrl100) && // a cover to blur, as a safe https link
      track.trackExplicitness !== "explicit" && // double-check: no explicit songs
      track.trackName && // a title
      normalizeTitle(track.trackName) // a title that isn't empty after cleaning
  );

  if (playable.length === 0) return null;

  // Pick one at random.
  return playable[Math.floor(Math.random() * playable.length)];
}

// Runs ffmpeg with the given settings and gives back its output
// (the cut audio or the blurred image) as a Buffer (raw file data).
// Both makeClip and makeBlurredCover use this.
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    // "-loglevel error" keeps ffmpeg quiet unless something goes wrong.
    // "-protocol_whitelist" only lets ffmpeg download from https links
    //   (a second safety lock on top of isSafeUrl).
    // "pipe:1" tells ffmpeg to hand the result back to us instead of saving a file.
    const ffmpeg = spawn(ffmpegPath, [
      "-loglevel", "error",
      "-protocol_whitelist", "https,tls,tcp",
      ...args,
      "pipe:1",
    ]);

    // ffmpeg sends its output in small pieces ("chunks"), so we collect them.
    const chunks = [];

    // Safety net: if the download hangs, stop ffmpeg after 20 seconds.
    const timer = setTimeout(() => ffmpeg.kill(), 20_000);

    // Save each piece of output as it arrives.
    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));

    // ffmpeg could not start at all.
    ffmpeg.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    // ffmpeg finished. Code 0 means success.
    ffmpeg.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks)); // join the pieces into one file
      } else {
        reject(new Error(`ffmpeg stopped with code ${code}`));
      }
    });
  });
}

// Returns the first `seconds` of the iTunes preview as an mp3.
// (mp3 is used because Discord can play it right in the chat.)
export function makeClip(previewUrl, seconds) {
  return runFfmpeg([
    "-i", previewUrl, // input: the 30-second iTunes preview
    "-t", String(seconds), // only keep this many seconds
    "-vn", // ignore any video/artwork inside the audio file
    "-map_metadata", "-1", // remove hidden file info, which could reveal the song title
    "-f", "mp3", // output format: mp3
    "-b:a", "128k", // audio quality
  ]);
}

// Returns the album cover, blurred so it's a hint and not the answer, as a png.
export function makeBlurredCover(artworkUrl) {
  return runFfmpeg([
    "-i", artworkUrl.replace("100x100", "300x300"), // ask iTunes for a bigger cover
    "-vf", "scale=300:300,boxblur=12:2", // resize, then blur (bigger numbers = blurrier)
    "-frames:v", "1", // it's one picture, not a video
    "-f", "image2pipe", // output a single image...
    "-c:v", "png", // ...as a png
  ]);
}

// ==================================================
// 5. The game itself
// ==================================================

// The card shown at the end, revealing the real song.
function answerCard(track) {
  const card = new EmbedBuilder()
    .setColor(0x1db954) // green, same as the /song card
    .setTitle(shorten(track.trackName, 256))
    .setDescription(`by **${shorten(track.artistName, 200)}**`)
    .addFields({ name: "Album", value: shorten(track.collectionName, 1024) })
    .setThumbnail(track.artworkUrl100.replace("100x100", "300x300")); // the real, un-blurred cover

  // Make the title a link to the song on Apple Music, if we have one.
  if (track.trackViewUrl) card.setURL(track.trackViewUrl);
  return card;
}

// Plays ONE round: sends the hints, then waits for the player's guess.
// Returns the player's guess message, or undefined if time ran out.
async function playRound(message, track, round, roundNumber) {
  // Hint 1 (every round): the audio clip.
  const files = [
    new AttachmentBuilder(await makeClip(track.previewUrl, round.seconds), {
      name: `guess-${roundNumber}.mp3`,
    }),
  ];

  // The yellow card that explains this round.
  const hint = new EmbedBuilder()
    .setColor(0xf1c40f) // yellow
    .setTitle(`🎵 Guess the song (guess ${roundNumber} of ${ROUNDS.length})`)
    .setDescription(
      `Listen to **${round.seconds} seconds** and type the song title.\n` +
      `You have ${GUESS_TIME_MS / 1000} seconds. ` +
      `Worth **${round.points}** point${round.points === 1 ? "" : "s"}.`
    );

  // Hint 2 (rounds 2 and 3): the blurred album cover.
  if (round.showCover) {
    files.push(
      new AttachmentBuilder(await makeBlurredCover(track.artworkUrl100), {
        name: "cover.png",
      })
    );
    // "attachment://cover.png" tells Discord to show the file we attached
    // inside the card, instead of as a separate file.
    hint.setImage("attachment://cover.png");
  }

  // Hint 3 (round 3 only): the artist's name.
  if (round.showArtist) {
    hint.addFields({ name: "Artist", value: shorten(track.artistName, 1024) });
  }

  // Send the card + files to the channel.
  await message.channel.send({ embeds: [hint], files });

  // Wait for the player's next message in this channel.
  const collected = await message.channel.awaitMessages({
    filter: (m) => m.author.id === message.author.id, // only the player's messages count
    max: 1, // stop after one guess
    time: GUESS_TIME_MS, // or stop when time runs out
  });

  // The guess, or undefined if they didn't type anything in time.
  return collected.first();
}

// Runs a whole game: gets a genre, picks a song, then plays up to 3 rounds.
// `typedGenre` is whatever came after "/guess" (empty if nothing).
async function playGame(message, typedGenre) {
  const channelId = message.channel.id;
  const playerId = message.author.id;

  // Check the limits before starting. Each one returns a short message
  // explaining why the game can't start yet.

  // Only one game per channel, otherwise guesses would get mixed up.
  if (activeGames.has(channelId)) {
    await message.reply("A guessing game is already running in this channel. Wait for it to finish!");
    return;
  }

  // Only one game per player (activeGames values are the player IDs).
  if ([...activeGames.values()].includes(playerId)) {
    await message.reply("You're already playing in another channel. Finish that game first!");
    return;
  }

  // Not too many games across the whole bot.
  if (activeGames.size >= MAX_GAMES_AT_ONCE) {
    await message.reply("Too many games are running right now. Try again in a minute!");
    return;
  }

  // A short break between a player's games.
  const waitMs = COOLDOWN_MS - (Date.now() - (lastPlayed.get(playerId) || 0));
  if (waitMs > 0) {
    await message.reply(`Take a breather! You can play again in ${Math.ceil(waitMs / 1000)} seconds.`);
    return;
  }

  // Remember that this player is now playing in this channel.
  activeGames.set(channelId, playerId);

  // "try ... finally" makes sure the channel is ALWAYS freed at the end,
  // even if something goes wrong in the middle (like iTunes being down).
  try {
    // If they typed a genre ("/guess jazz"), use it. Otherwise ask with buttons.
    const genre = typedGenre || (await askForGenre(message));
    if (!genre) return; // they didn't pick in time, so the game is cancelled

    await message.channel.sendTyping(); // shows "Bot is typing..." while we search

    const track = await pickRandomTrack(genre);
    if (!track) {
      await message.reply("I couldn't find a song for that genre. Try another one, like: /guess pop");
      return;
    }

    // Play the rounds one at a time.
    for (let i = 0; i < ROUNDS.length; i++) {
      const round = ROUNDS[i];
      const roundNumber = i + 1; // people count from 1, code counts from 0
      const guess = await playRound(message, track, round, roundNumber);

      // CORRECT: give points, show the answer, and end the game.
      if (guess && isCorrectGuess(guess.content, track.trackName)) {
        const total = (scores.get(message.author.id) || 0) + round.points;
        scores.set(message.author.id, total);

        await guess.reply({
          content: `🎉 You got it on guess ${roundNumber}! +${round.points} (total: ${total})`,
          embeds: [answerCard(track)],
        });
        return;
      }

      // WRONG or TOO SLOW: tell them, then the loop moves on to the next round.
      // (No message after the last round, because the answer is revealed below.)
      const isLastRound = roundNumber === ROUNDS.length;
      if (!isLastRound) {
        const miss = guess ? "❌ Not quite!" : "⏰ Time's up!";
        await message.channel.send(`${miss} Here's a bigger hint...`);
      }
    }

    // All 3 guesses used up: reveal the answer.
    await message.channel.send({
      content: "😢 Out of guesses! The answer was:",
      embeds: [answerCard(track)],
    });
  } finally {
    // The game is over (won, lost, or crashed), so free up the channel
    // and start this player's cooldown.
    activeGames.delete(channelId);
    lastPlayed.set(playerId, Date.now());
  }
}

// ==================================================
// 6. The leaderboard
// ==================================================

// Shows the top 10 players, highest score first.
async function showLeaderboard(message) {
  const top = [...scores.entries()] // turn the Map into a list of [userId, points]
    .sort((a, b) => b[1] - a[1]) // sort by points, highest first
    .slice(0, 10); // keep the top 10

  if (top.length === 0) {
    await message.reply("No scores yet. Start a game with /guess!");
    return;
  }

  // "<@userId>" is how Discord shows a user's name in a message.
  const lines = top.map(([userId, points], i) => `${i + 1}. <@${userId}>: ${points} pts`);

  await message.reply({
    content: `🏆 **Guess the Song leaderboard**\n${lines.join("\n")}`,
    allowedMentions: { parse: [] }, // show the names, but don't send everyone a ping
  });
}

// ==================================================
// 7. The event
// messageCreate.js calls execute() for every message sent in the server.
// ==================================================

const event = {
  name: "messageCreate",

  async execute(message) {
    // Ignore messages from bots (including this one).
    if (message.author.bot) return;

    // Lowercase so "/Guess" and "/GUESS" also work.
    const content = message.content.trim().toLowerCase();
    const isGuess = content === "/guess" || content.startsWith("/guess ");
    const isLeaderboard = content === "/leaderboard";

    // Not one of our commands, so do nothing.
    if (!isGuess && !isLeaderboard) return;

    try {
      if (isGuess) {
        // Everything after "/guess" is the genre, e.g. "/guess rock" -> "rock".
        await playGame(message, content.slice("/guess".length).trim());
      } else {
        await showLeaderboard(message);
      }
    } catch (error) {
      // If anything goes wrong, log it and tell the player.
      // An error here must never crash the whole bot.
      console.error("Guess game error:", error);
      await message
        .reply("Sorry, something went wrong with the game. Try again in a moment.")
        .catch(() => {}); // if even this reply fails (e.g. no permission to post), ignore it
    }
  },
};

export default event;

// Exported so the tests can check and reset them.
export { scores, activeGames, lastPlayed };