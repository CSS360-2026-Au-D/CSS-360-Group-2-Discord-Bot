import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Mocks (must be declared before importing the handler) ----------
vi.mock("../src/services/gemini.js", () => ({
  askGemini: vi.fn(),
}));

vi.mock("axios", () => ({
  default: { get: vi.fn() },
}));

vi.mock("@discordjs/voice", () => ({
  joinVoiceChannel: vi.fn(() => ({ subscribe: vi.fn(), destroy: vi.fn() })),
  createAudioPlayer: vi.fn(() => ({ play: vi.fn(), on: vi.fn() })),
  createAudioResource: vi.fn(() => ({})),
  AudioPlayerStatus: { Idle: "idle" },
  StreamType: { Raw: "raw" },
}));

vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({ on: vi.fn(), stdout: {}, kill: vi.fn() })),
}));

vi.mock("ffmpeg-static", () => ({ default: "/fake/ffmpeg" }));

// ---------- Imports (after mocks) ----------
import axios from "axios";
import { askGemini } from "../src/services/gemini.js";
import { joinVoiceChannel } from "@discordjs/voice";
import event from "../src/events/messageCreate.js"; // <-- adjust path

// ---------- Helpers ----------
function makeMessage(content, { bot = false } = {}) {
  const voiceChannel = {
    id: "1559754789489877002",
    isVoiceBased: () => true,
    guild: { id: "guild-1", voiceAdapterCreator: {} },
  };

  return {
    content,
    author: { bot },
    reply: vi.fn().mockResolvedValue(undefined),
    channel: {
      sendTyping: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue(undefined),
    },
    guild: {
      channels: { cache: { get: vi.fn(() => voiceChannel) } },
    },
  };
}

const fakeTrack = {
  trackName: "Blinding Lights",
  artistName: "The Weeknd",
  collectionName: "After Hours",
  releaseDate: "2020-03-20T08:00:00Z",
  primaryGenreName: "Pop",
  artworkUrl100: "https://example.com/100x100bb.jpg",
  trackViewUrl: "https://music.apple.com/track/1",
  previewUrl: "https://example.com/preview.m4a",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// ---------- Tests ----------
describe("messageCreate event smoke test", () => {
  it("exports a valid event definition", () => {
    expect(event.name).toBe("messageCreate");
    expect(typeof event.execute).toBe("function");
  });

  it("ignores messages from bots", async () => {
    const msg = makeMessage("hello", { bot: true });
    await event.execute(msg);
    expect(msg.reply).not.toHaveBeenCalled();
  });

  it("ignores unrelated messages", async () => {
    const msg = makeMessage("just chatting");
    await event.execute(msg);
    expect(msg.reply).not.toHaveBeenCalled();
    expect(msg.channel.send).not.toHaveBeenCalled();
  });

  it("responds to hello, ping, and help", async () => {
    for (const [input, expected] of [
      ["hello", "Welcome"],
      ["PING", "Pong"],
      ["help", "Available commands"],
    ]) {
      const msg = makeMessage(input);
      await event.execute(msg);
      expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining(expected));
    }
  });

  describe("/song", () => {
    it("asks for a song name when none is given", async () => {
      const msg = makeMessage("/song");
      await event.execute(msg);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining("Please enter a song name")
      );
      expect(axios.get).not.toHaveBeenCalled();
    });

    it("returns an embed with a preview for a valid song", async () => {
      axios.get.mockResolvedValue({ data: { results: [fakeTrack] } });
      const msg = makeMessage("/song Blinding Lights");
      await event.execute(msg);

      expect(axios.get).toHaveBeenCalledWith(
        "https://itunes.apple.com/search",
        expect.objectContaining({
          params: expect.objectContaining({ term: "Blinding Lights" }),
        })
      );
      const withEmbed = msg.reply.mock.calls.find(
        ([arg]) => typeof arg === "object" && arg.embeds
      );
      expect(withEmbed).toBeDefined();
      expect(withEmbed[0].files[0].attachment).toBe(fakeTrack.previewUrl);
    });

    it("handles no results", async () => {
      axios.get.mockResolvedValue({ data: { results: [] } });
      const msg = makeMessage("/song asdfghjkl");
      await event.execute(msg);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining("No results found")
      );
    });

    it("handles API failure without throwing", async () => {
      axios.get.mockRejectedValue(new Error("network down"));
      const msg = makeMessage("/song Anything");
      await expect(event.execute(msg)).resolves.not.toThrow();
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining("couldn't reach the music service")
      );
    });
  });

  describe("/play", () => {
    it("joins the voice channel and announces the song", async () => {
      axios.get.mockResolvedValue({ data: { results: [fakeTrack] } });
      const msg = makeMessage("/play Blinding Lights");
      await event.execute(msg);

      expect(joinVoiceChannel).toHaveBeenCalledTimes(1);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining("Playing **Blinding Lights**")
      );
    });

    it("reports when no playable track is found", async () => {
      axios.get.mockResolvedValue({ data: { results: [] } });
      const msg = makeMessage("/play nothing");
      await event.execute(msg);
      expect(msg.reply).toHaveBeenCalledWith("Couldn't find a playable song!");
      expect(joinVoiceChannel).not.toHaveBeenCalled();
    });

    it("reports when the voice channel is missing", async () => {
      axios.get.mockResolvedValue({ data: { results: [fakeTrack] } });
      const msg = makeMessage("/play Blinding Lights");
      msg.guild.channels.cache.get.mockReturnValue(undefined);
      await event.execute(msg);
      expect(msg.reply).toHaveBeenCalledWith(
        "I couldn't find that voice channel!"
      );
    });
  });

  describe("/similar", () => {
    it("asks for a song name when none is given", async () => {
      const msg = makeMessage("/similar");
      await event.execute(msg);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining("Please enter a song name")
      );
      expect(askGemini).not.toHaveBeenCalled();
    });

    it("sends Gemini recommendations", async () => {
      askGemini.mockResolvedValue("1. Song A - Artist A");
      const msg = makeMessage("/similar Blinding Lights");
      await event.execute(msg);
      expect(askGemini).toHaveBeenCalledWith(
        expect.stringContaining("Blinding Lights")
      );
      expect(msg.channel.send).toHaveBeenCalledWith(
        expect.stringContaining("Similar songs")
      );
    });

    it("handles Gemini failure", async () => {
      askGemini.mockRejectedValue(new Error("quota"));
      const msg = makeMessage("/similar X");
      await event.execute(msg);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining("couldn't generate similar songs")
      );
    });
  });

  describe("/ai", () => {
    it("asks for a question when none is given", async () => {
      const msg = makeMessage("/ai");
      await event.execute(msg);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining("Please enter a question")
      );
    });

    it("replies with the Gemini answer", async () => {
      askGemini.mockResolvedValue("Python is a programming language.");
      const msg = makeMessage("/ai What is Python?");
      await event.execute(msg);
      expect(askGemini).toHaveBeenCalledWith("What is Python?");
      expect(msg.reply).toHaveBeenCalledWith(
        "Python is a programming language."
      );
    });

    it("splits long answers into Discord-safe chunks", async () => {
      askGemini.mockResolvedValue("a".repeat(4000));
      const msg = makeMessage("/ai write a lot");
      await event.execute(msg);
      expect(msg.reply).toHaveBeenCalledTimes(1);
      expect(msg.channel.send).toHaveBeenCalledTimes(2); // 1900 + 1900 + 200
      for (const [chunk] of [
        ...msg.reply.mock.calls,
        ...msg.channel.send.mock.calls,
      ]) {
        expect(chunk.length).toBeLessThanOrEqual(1900);
      }
    });

    it("handles Gemini failure", async () => {
      askGemini.mockRejectedValue(new Error("down"));
      const msg = makeMessage("/ai hi");
      await event.execute(msg);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining("temporarily unavailable")
      );
    });
  });
});

