
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import event, { favorites } from "../src/events/favorite-song.js";

beforeEach(() => {
    // Keep each test independent
    favorites.clear();
});

function createMessage({
    content,
    userId = "user-1",
    authorBot = false,
    fetchedMessage = null,
    hasReference = true
}) {
    const replies = [];

    const message = {
        author: {
            id: userId,
            bot: authorBot
        },
        content,
        reference: hasReference ? { messageId: "reply-1" } : null,
        channel: {
            messages: {
                fetch: async () => fetchedMessage
            }
        },
        client: {
            user: { id: "bot-1" }
        },
        reply: async (response) => {
            replies.push(response);
        }
    };

    return { message, replies };
}

function favoriteEmbed(reply) {
    return reply.embeds[0].toJSON();
}

test("A user can save a song sent by this bot", async () => {
    const botSong = {
        author: { bot: true, id: "bot-1" },
        content: "Perfect by Ed Sheeran"
    };

    const { message, replies } = createMessage({
        content: "/saveFavorite",
        fetchedMessage: botSong
    });

    await event.execute(message);

    assert.deepEqual(
        favorites.get("user-1"),
        ["Perfect by Ed Sheeran"]
    );

    assert.deepEqual(replies, ["Added to your favorites!"]);
});

test("A user can save a song from this bot's embed", async () => {
    const botSong = {
        author: { bot: true, id: "bot-1" },
        content: "",
        embeds: [{ title: "Perfect", description: "by **Ed Sheeran**" }]
    };

    const { message, replies } = createMessage({
        content: "/saveFavorite",
        fetchedMessage: botSong
    });

    await event.execute(message);

    assert.deepEqual(favorites.get("user-1"), ["Perfect by Ed Sheeran"]);
    assert.deepEqual(replies, ["Added to your favorites!"]);
});

test("A user cannot save the same song twice with different formatting", async () => {
    const firstSave = createMessage({
        content: "/saveFavorite",
        fetchedMessage: {
            author: { bot: true, id: "bot-1" },
            content: "Perfect by Ed Sheeran"
        }
    });
    const duplicateSave = createMessage({
        content: "/saveFavorite",
        fetchedMessage: {
            author: { bot: true, id: "bot-1" },
            content: "🎵 Playing **Perfect** by **Ed Sheeran**!"
        }
    });

    await event.execute(firstSave.message);
    await event.execute(duplicateSave.message);

    assert.deepEqual(favorites.get("user-1"), ["Perfect by Ed Sheeran"]);
    assert.deepEqual(duplicateSave.replies, [
        "That song is already in your favorites."
    ]);
});

test("A user can view their saved favorites", async () => {
    favorites.set("user-1", [
        "Perfect by Ed Sheeran",
        "Hello by Adele"
    ]);

    const { message, replies } = createMessage({
        content: "/viewFavorites"
    });

    await event.execute(message);

    const embed = favoriteEmbed(replies[0]);
    assert.equal(embed.title, "🎧 Your Personal Soundtrack");
    assert.equal(
        embed.description,
        "Your favorite tracks, all in one place.\n\n**1.**  Perfect by Ed Sheeran\n\n**2.**  Hello by Adele"
    );
    assert.equal(embed.fields[0].value, "2 songs saved");
    assert.equal(
        embed.fields[1].value,
        "`/removeFavorite <number>`\n`/clearFavorites`"
    );
    assert.equal(
        embed.footer.text,
        "Reply to a song message with /saveFavorite to add more"
    );
});

test("A user with no favorites receives an empty-list message", async () => {
    const { message, replies } = createMessage({
        content: "/viewFavorites"
    });

    await event.execute(message);

    assert.deepEqual(replies, [
        "You have no favorite songs yet!"
    ]);
});

test("Users cannot see another user's favorites", async () => {
    favorites.set("user-1", ["Perfect by Ed Sheeran"]);

    const { message, replies } = createMessage({
        content: "/viewFavorites",
        userId: "user-2"
    });

    await event.execute(message);

    assert.deepEqual(replies, [
        "You have no favorite songs yet!"
    ]);
});

test("A user can remove a favorite by its displayed number", async () => {
    favorites.set("user-1", ["Perfect by Ed Sheeran", "Hello by Adele"]);

    const { message, replies } = createMessage({
        content: "/removeFavorite 1"
    });

    await event.execute(message);

    assert.deepEqual(favorites.get("user-1"), ["Hello by Adele"]);
    assert.deepEqual(replies, [
        "Removed Perfect by Ed Sheeran from your favorites."
    ]);
});

test("Removing an invalid favorite number does not change the list", async () => {
    favorites.set("user-1", ["Perfect by Ed Sheeran"]);

    const { message, replies } = createMessage({
        content: "/removeFavorite 2"
    });

    await event.execute(message);

    assert.deepEqual(favorites.get("user-1"), ["Perfect by Ed Sheeran"]);
    assert.deepEqual(replies, ["That number isn't in your favorites list."]);
});

test("A user can clear only their own favorites", async () => {
    favorites.set("user-1", ["Perfect by Ed Sheeran"]);
    favorites.set("user-2", ["Hello by Adele"]);

    const { message, replies } = createMessage({
        content: "/clearFavorites"
    });

    await event.execute(message);

    assert.equal(favorites.has("user-1"), false);
    assert.deepEqual(favorites.get("user-2"), ["Hello by Adele"]);
    assert.deepEqual(replies, ["Your favorites list has been cleared."]);
});

test("Clearing an empty favorites list gives feedback", async () => {
    const { message, replies } = createMessage({
        content: "/clearFavorites"
    });

    await event.execute(message);

    assert.deepEqual(replies, ["Your favorites list is already empty."]);
});

test("A user cannot save a song sent by another user", async () => {
    const userSong = {
        author: { bot: false, id: "user-1" },
        content: "Hello by Adele"
    };

    const { message, replies } = createMessage({
        content: "/saveFavorite",
        userId: "user-2",
        fetchedMessage: userSong
    });

    await event.execute(message);

    assert.equal(favorites.has("user-2"), false);
    assert.deepEqual(replies, [
        "You can only save a song message sent by this bot."
    ]);
});