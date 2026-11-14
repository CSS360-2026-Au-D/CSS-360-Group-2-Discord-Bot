
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

test("A user can view their saved favorites", async () => {
    favorites.set("user-1", [
        "Perfect by Ed Sheeran",
        "Hello by Adele"
    ]);

    const { message, replies } = createMessage({
        content: "/viewFavorites"
    });

    await event.execute(message);

    assert.equal(
        replies[0],
        "Your favorite songs:\n1. Perfect by Ed Sheeran\n2. Hello by Adele"
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
    assert.equal(replies.length, 0);
});