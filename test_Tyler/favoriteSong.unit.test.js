import { describe, it, expect, beforeEach, vi } from "vitest";
import event, { favorites } from "../src/events/favorite-song.js"; // adjust path to your file
import * as mod from "../src/events/favorite-song.js"; // adjust path to your file
console.log(Object.keys(mod)); // Log the keys of the imported module to see what is actually exported

const BOT_ID = "bot-123";

/**
 * Builds a fake Discord message. Override anything via `overrides`.
 */
function makeMessage({
    content = "",
    authorId = "user-1",
    authorIsBot = false,
    referenceId = undefined,
    originalMessage = undefined,
} = {}) {
    return {
        content,
        author: { id: authorId, bot: authorIsBot },
        reference: referenceId ? { messageId: referenceId } : undefined,
        reply: vi.fn().mockResolvedValue(undefined),
        client: { user: { id: BOT_ID } },
        channel: {
            messages: {
                fetch: vi.fn().mockResolvedValue(originalMessage),
            },
        },
    };
}

function botSong(content = "Never Gonna Give You Up", authorId = BOT_ID) {
    return { content, author: { id: authorId, bot: true } };
}

function favoriteEmbed(message) {
    return message.reply.mock.calls[0][0].embeds[0].toJSON();
}

describe("messageCreate event", () => {
    beforeEach(() => {
        favorites.clear();
    });

    it("has the correct event name", () => {
        expect(event.name).toBe("messageCreate");
    });

    describe("bot and unrelated messages", () => {
        it("ignores messages from bots", async () => {
            const message = makeMessage({ content: "/viewFavorites", authorIsBot: true });

            await event.execute(message);

            expect(message.reply).not.toHaveBeenCalled();
        });

        it("ignores messages that are not a recognized command", async () => {
            const message = makeMessage({ content: "hello there" });

            await event.execute(message);

            expect(message.reply).not.toHaveBeenCalled();
            expect(favorites.size).toBe(0);
        });
    });

    describe("/viewFavorites", () => {
        it("tells the user when they have no favorites", async () => {
            const message = makeMessage({ content: "/viewFavorites" });

            await event.execute(message);

            expect(message.reply).toHaveBeenCalledWith("You have no favorite songs yet!");
        });

        it("tells the user when their favorites list exists but is empty", async () => {
            favorites.set("user-1", []);
            const message = makeMessage({ content: "/viewFavorites" });

            await event.execute(message);

            expect(message.reply).toHaveBeenCalledWith("You have no favorite songs yet!");
        });

        it("lists favorites as a numbered list", async () => {
            favorites.set("user-1", ["Song A", "Song B", "Song C"]);
            const message = makeMessage({ content: "/viewFavorites" });

            await event.execute(message);

            expect(message.reply).toHaveBeenCalledTimes(1);
            const embed = favoriteEmbed(message);
            expect(embed.title).toBe("🎧 Your Personal Soundtrack");
            expect(embed.description).toBe(
                "Your favorite tracks, all in one place.\n\n" +
                "**1.**  Song A\n\n**2.**  Song B\n\n**3.**  Song C"
            );
            expect(embed.fields[0].value).toBe("3 songs saved");
            expect(embed.fields[1].value).toBe(
                "`/removeFavorite <number>`\n`/clearFavorites`"
            );
        });

        it("trims whitespace around the command", async () => {
            favorites.set("user-1", ["Song A"]);
            const message = makeMessage({ content: "   /viewFavorites  \n" });

            await event.execute(message);

            const embed = favoriteEmbed(message);
            expect(embed.description).toBe(
                "Your favorite tracks, all in one place.\n\n**1.**  Song A"
            );
        });

        it("only shows the requesting user's favorites", async () => {
            favorites.set("user-1", ["Mine"]);
            favorites.set("user-2", ["Theirs"]);
            const message = makeMessage({ content: "/viewFavorites", authorId: "user-2" });

            await event.execute(message);

            const embed = favoriteEmbed(message);
            expect(embed.description).toContain("**1.**  Theirs");
            expect(embed.description).not.toContain("Mine");
        });
    });

    describe("/saveFavorite", () => {
        it("saves the replied-to bot message and confirms", async () => {
            const message = makeMessage({
                content: "/saveFavorite",
                referenceId: "orig-1",
                originalMessage: botSong("Bohemian Rhapsody"),
            });

            await event.execute(message);

            expect(message.channel.messages.fetch).toHaveBeenCalledWith("orig-1");
            expect(favorites.get("user-1")).toEqual(["Bohemian Rhapsody"]);
            expect(message.reply).toHaveBeenCalledWith("Added to your favorites!");
        });

        it("trims whitespace around the command", async () => {
            const message = makeMessage({
                content: "  /saveFavorite ",
                referenceId: "orig-1",
                originalMessage: botSong("Song A"),
            });

            await event.execute(message);

            expect(favorites.get("user-1")).toEqual(["Song A"]);
        });

        it("does nothing when the message is not a reply", async () => {
            const message = makeMessage({ content: "/saveFavorite" });

            await event.execute(message);

            expect(message.channel.messages.fetch).not.toHaveBeenCalled();
            expect(message.reply).toHaveBeenCalledWith(
                "Reply to one of my song messages with /saveFavorite to save it."
            );
            expect(favorites.get("user-1") ?? []).toEqual([]);
        });

        it("explains when the original message was not sent by this bot", async () => {
            const message = makeMessage({
                content: "/saveFavorite",
                referenceId: "orig-1",
                originalMessage: { content: "Song A", author: { id: "user-9", bot: false } },
            });

            await event.execute(message);

            expect(message.reply).toHaveBeenCalledWith(
                "You can only save a song message sent by this bot."
            );
            expect(favorites.get("user-1") ?? []).toEqual([]);
        });

        it("explains when the original message came from a different bot", async () => {
            const message = makeMessage({
                content: "/saveFavorite",
                referenceId: "orig-1",
                originalMessage: botSong("Song A", "some-other-bot"),
            });

            await event.execute(message);

            expect(message.reply).toHaveBeenCalledWith(
                "You can only save a song message sent by this bot."
            );
            expect(favorites.get("user-1") ?? []).toEqual([]);
        });

        it("explains when the original message contains no song", async () => {
            const message = makeMessage({
                content: "/saveFavorite",
                referenceId: "orig-1",
                originalMessage: botSong("   "),
            });

            await event.execute(message);

            expect(message.reply).toHaveBeenCalledWith(
                "I couldn't find a song title in that message. Reply to a song result and try again."
            );
            expect(favorites.get("user-1") ?? []).toEqual([]);
        });

        it("accumulates multiple favorites for the same user", async () => {
            for (const song of ["Song A", "Song B"]) {
                const message = makeMessage({
                    content: "/saveFavorite",
                    referenceId: "orig",
                    originalMessage: botSong(song),
                });
                await event.execute(message);
            }

            expect(favorites.get("user-1")).toEqual(["Song A", "Song B"]);
        });

        it("keeps favorites separate per user", async () => {
            await event.execute(
                makeMessage({
                    content: "/saveFavorite",
                    authorId: "user-1",
                    referenceId: "orig",
                    originalMessage: botSong("Song A"),
                })
            );
            await event.execute(
                makeMessage({
                    content: "/saveFavorite",
                    authorId: "user-2",
                    referenceId: "orig",
                    originalMessage: botSong("Song B"),
                })
            );

            expect(favorites.get("user-1")).toEqual(["Song A"]);
            expect(favorites.get("user-2")).toEqual(["Song B"]);
        });

        it("allows a saved song to be viewed afterwards", async () => {
            await event.execute(
                makeMessage({
                    content: "/saveFavorite",
                    referenceId: "orig",
                    originalMessage: botSong("Song A"),
                })
            );

            const viewMessage = makeMessage({ content: "/viewFavorites" });
            await event.execute(viewMessage);

            const embed = favoriteEmbed(viewMessage);
            expect(embed.description).toContain("**1.**  Song A");
        });
    });
});