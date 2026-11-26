import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import event, {
  normalizeTitle,
  isCorrectGuess,
  isPlayingGuessGame,
  isSafeUrl,
  scores,
  activeGames,
  lastPlayed,
} from "../src/events/guess-game.js";

beforeEach(() => {
  scores.clear();
  activeGames.clear();
  lastPlayed.clear();
});

function createMessage(content, { userId = "user-1", channelId = "chan-1" } = {}) {
  const replies = [];
  return {
    replies,
    content,
    author: { id: userId, bot: false },
    channel: { id: channelId, sendTyping: async () => {} },
    reply: async (r) => replies.push(r),
  };
}

test("normalizeTitle ignores case, punctuation and extras in brackets", () => {
  assert.equal(normalizeTitle("Blinding Lights"), "blinding lights");
  assert.equal(normalizeTitle("Don't Stop Me Now!"), "dont stop me now");
  assert.equal(normalizeTitle("Levitating (feat. DaBaby)"), "levitating");
  assert.equal(normalizeTitle("Here Comes the Sun - Remastered 2019"), "here comes the sun");
  assert.equal(normalizeTitle("Café"), "cafe");
});

test("isCorrectGuess accepts the title written differently", () => {
  assert.equal(isCorrectGuess("blinding lights", "Blinding Lights"), true);
  assert.equal(isCorrectGuess("  LEVITATING ", "Levitating (feat. DaBaby)"), true);
  assert.equal(isCorrectGuess("rock and roll", "Rock & Roll"), true);
});

test("isCorrectGuess rejects wrong or partial answers", () => {
  assert.equal(isCorrectGuess("blinding", "Blinding Lights"), false);
  assert.equal(isCorrectGuess("", "Blinding Lights"), false);
  assert.equal(isCorrectGuess("anything", "(Intro)"), false);
});

test("isCorrectGuess works for titles that are not in English letters", () => {
  assert.equal(isCorrectGuess("다이너마이트", "다이너마이트"), true);
});

test("isPlayingGuessGame is only true for the player in that channel", () => {
  activeGames.set("chan-1", "user-1");
  assert.equal(isPlayingGuessGame(createMessage("x")), true);
  assert.equal(isPlayingGuessGame(createMessage("x", { userId: "user-2" })), false);
  assert.equal(isPlayingGuessGame(createMessage("x", { channelId: "chan-2" })), false);
});

test("isPlayingGuessGame is false when no game is running", () => {
  assert.equal(isPlayingGuessGame(createMessage("x")), false);
  assert.equal(isPlayingGuessGame({ content: "x", author: {}, channel: {} }), false);
});

test("/guess refuses to start a second game in the same channel", async () => {
  activeGames.set("chan-1", "user-2");
  const message = createMessage("/guess");
  await event.execute(message);
  assert.match(message.replies[0], /already running/);
});

// A fake "Pick a genre" message. `clicks` is the list of people who click
// a button, in order. When the list runs out, it acts like time ran out.
function fakeGenrePrompt(clicks) {
  const prompt = {
    edits: [],
    privateReplies: [],
    edit: async (m) => prompt.edits.push(m),
    awaitMessageComponent: async ({ filter }) => {
      for (const userId of clicks) {
        const interaction = {
          user: { id: userId },
          customId: "guess-genre:rock",
          reply: async (m) => prompt.privateReplies.push(m),
        };
        if (await filter(interaction)) return interaction;
      }
      throw new Error("time ran out");
    },
  };
  return prompt;
}

test("/guess shows genre buttons and cancels if nobody picks in time", async () => {
  const message = createMessage("/guess");
  const prompt = fakeGenrePrompt([]);
  message.reply = async (r) => { message.replies.push(r); return prompt; };

  await event.execute(message);

  assert.match(message.replies[0].content, /Pick a genre/);
  assert.equal(message.replies[0].components.length, 2); // 9 buttons -> 2 rows of up to 5
  assert.match(prompt.edits[0].content, /cancelled/);
  assert.deepEqual(prompt.edits[0].components, []); // buttons removed
  assert.equal(activeGames.has("chan-1"), false); // channel is free again
});

test("other people can't pick the genre for the player", async () => {
  const message = createMessage("/guess");
  const prompt = fakeGenrePrompt(["someone-else"]);
  message.reply = async (r) => { message.replies.push(r); return prompt; };

  await event.execute(message);

  assert.match(prompt.privateReplies[0].content, /isn't your game/);
  assert.match(prompt.edits[0].content, /cancelled/); // the player never picked
});

// ----- Safety limits (from the threat model) -----

test("a player can't run two games at once in different channels", async () => {
  activeGames.set("other-channel", "user-1");
  const message = createMessage("/guess");
  await event.execute(message);
  assert.match(message.replies[0], /already playing/);
});

test("no new games start when the bot is at its limit", async () => {
  for (let i = 0; i < 5; i++) activeGames.set(`chan-${i + 10}`, `player-${i}`);
  const message = createMessage("/guess");
  await event.execute(message);
  assert.match(message.replies[0], /Too many games/);
});

test("a player has to wait a few seconds between games", async () => {
  lastPlayed.set("user-1", Date.now()); // their last game just ended
  const message = createMessage("/guess");
  await event.execute(message);
  assert.match(message.replies[0], /play again in \d+ seconds/);
});

test("the cooldown starts when a game ends", async () => {
  const message = createMessage("/guess");
  message.reply = async () => fakeGenrePrompt([]); // nobody picks, so the game ends
  await event.execute(message);
  assert.ok(lastPlayed.has("user-1"));
});

test("isSafeUrl only allows https links", () => {
  assert.equal(isSafeUrl("https://audio-ssl.itunes.apple.com/song.m4a"), true);
  assert.equal(isSafeUrl("http://example.com/song.m4a"), false);
  assert.equal(isSafeUrl("file:///etc/passwd"), false);
  assert.equal(isSafeUrl("not a link"), false);
  assert.equal(isSafeUrl(undefined), false);
});

test("/leaderboard says when there are no scores", async () => {
  const message = createMessage("/leaderboard");
  await event.execute(message);
  assert.match(message.replies[0], /No scores yet/);
});

test("/leaderboard lists players from highest to lowest", async () => {
  scores.set("low", 1);
  scores.set("high", 6);
  const message = createMessage("/leaderboard");
  await event.execute(message);
  const text = message.replies[0].content;
  assert.ok(text.indexOf("<@high>") < text.indexOf("<@low>"));
  assert.deepEqual(message.replies[0].allowedMentions, { parse: [] });
});

test("other messages are ignored", async () => {
  const message = createMessage("hello");
  await event.execute(message);
  assert.equal(message.replies.length, 0);
});