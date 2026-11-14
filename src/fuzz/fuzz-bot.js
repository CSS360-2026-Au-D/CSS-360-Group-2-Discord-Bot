// Fuzz test for the whole bot.
// Run from the repo root:  node src/fuzz/fuzz-bot.js
//
// It sends random messages (random command + random text) to the real bot code.
// iTunes, Gemini and Discord are all faked, so it needs no network and no bot token.

import fc from "fast-check";
import axios from "axios";
import messageCreate from "../events/messageCreate.js";
import favoriteSong from "../events/favorite-song.js";

const DISCORD_LIMIT = 2000; // max characters a bot can send in one message

// ---------- Fake outside services (already done for you) ----------

let fakeTrack = null;       // what fake iTunes returns (null = "no results")
let fakeGeminiText = "";    // what fake Gemini returns

// Fake iTunes (used by /song and /play)
axios.get = async () => ({ data: { results: fakeTrack ? [fakeTrack] : [] } });

// Fake Gemini (used by /ai and /similar)
process.env.GEMINI_API_KEY = "fake-key";
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ candidates: [{ content: { parts: [{ text: fakeGeminiText }] } }] }),
});

// Hide the bot's console output so the results are easy to read.
console.error = () => {};
console.log = () => {};
const print = (...args) => process.stdout.write(args.join(" ") + "\n");

// A fake Discord message. Like real Discord, it rejects any message over
// 2,000 characters. It records what was sent and what was rejected.
function fakeMessage(content) {
  const sent = [];
  const rejected = [];
  const send = async (reply) => {
    const text = typeof reply === "string" ? reply : reply.content ?? "";
    if (text.length > DISCORD_LIMIT) {
      rejected.push(text);
      throw new Error(`Message too long: ${text.length} characters`);
    }
    sent.push(text);
  };
  return {
    sent,
    rejected,
    content,
    author: { bot: false, id: "fuzz-user" },
    reply: send,
    reference: undefined,
    channel: { sendTyping: async () => {}, send, messages: { fetch: async () => null } },
    guild: { channels: { cache: { get: () => undefined } } }, // no voice channel
  };
}

// ---------- Random inputs ----------

// A random command from the bot, followed by random text.
const randomMessage = fc
  .tuple(
    fc.constantFrom("/song","/play", "/similar", "/ai", "/viewFavorites", "/saveFavorite", "hello", "ping", "help"),
    fc.oneof(fc.string({ maxLength: 100 }), fc.string({ minLength: 1990, maxLength: 4000 }))
  )
  .map(([command, text]) => command + " " + text);

// Random iTunes result: either "no results" or a track with random details.
const randomTrack = fc.option(
  fc.record({
    trackName: fc.string({ minLength: 1, maxLength: 200 }),
    artistName: fc.string({ minLength: 1, maxLength: 200 }),
    collectionName: fc.string({ maxLength: 200 }),
    previewUrl: fc.constant("https://example.com/preview.m4a"),
  }),
  { nil: null }
);

// Random Gemini reply, up to 3,000 characters.
const randomGeminiText = fc.string({ maxLength: 3000 });

// ---------- The fuzz test ----------

const property = fc.asyncProperty(randomMessage, randomTrack, randomGeminiText, async (text, track, gemini) => {
  fakeTrack = track;
  fakeGeminiText = gemini;

  const msg = fakeMessage(text);

  // Rule 1: the bot should never crash, whatever it receives.
  await messageCreate.execute(msg);
  await favoriteSong.execute(msg);

  // Rule 2: the bot should never try to send a message Discord would reject.
  return msg.rejected.length === 0;
});

try {
  await fc.assert(property, { numRuns: 500 });
  print("PASS: the bot handled every random message correctly.");
} catch (err) {
  print("FAIL: fast-check found a message that breaks the bot.\n");
  print(err.message.split("\n").slice(0, 2).join("\n").slice(0, 300));
  const m = err.message.match(/Counterexample: \["([\s\S]*?)",/);
  if (m) print(`\nFailing message starts with: "${m[1].slice(0, 40)}..." (${m[1].length} characters)`);
  process.exitCode = 1;
}