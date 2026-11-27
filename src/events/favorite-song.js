import { EmbedBuilder } from "discord.js";

const favorites = new Map();

// Prefer plain message text; for embed-only song cards, build a title and
// artist string from the first titled embed.
function getSongFromMessage(message) {
    const content = message.content?.trim();
    if (content) return content;

    const embed = message.embeds?.find((item) => item.title);
    const title = embed?.title?.trim();
    const artist = embed?.description
        ?.replace(/\*\*/g, "")
        .replace(/^by\s+/i, "")
        .trim();

    if (title && artist) return `${title} by ${artist}`;
    return title || "";
}

function formatSong(song) {
    // Remove bot-added playback text and Markdown so titles display cleanly.
    return song
        .replace(/\*\*/g, "")
        .replace(/^🎵\s*Playing\s+/i, "")
        .replace(/!\s*$/, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeSong(song) {
    // Canonicalize song text before comparing favorites: remove Markdown and
    // /play's wrapper, collapse whitespace, and ignore capitalization.
    return formatSong(song).toLowerCase();
}

const event = {
    name: "messageCreate",

    async execute(message) {
        // Begin handling a user's favorite command. Ignore bot messages, then
        // view, remove, clear, or save only this user's favorites.
        if (message.author.bot) return;
        const content = message.content.trim();

        if (content === "/viewFavorites") {
            const userId = message.author.id;
            const userFavorites = favorites.get(userId) || [];
            if (userFavorites.length === 0) {
                await message.reply("You have no favorite songs yet!");
                return;
            }

            // FAVORITES EMBED DISPLAY
            // Clean and number each saved song; the number matches the argument
            // accepted by /removeFavorite.
            const list = userFavorites
                .map((song, index) => `**${index + 1}.**  ${formatSong(song)}`)
                .join("\n\n");

            // Present the list in the bot's green music theme, with the total,
            // management commands, and a reminder for adding more songs.
            const embed = new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle("🎧 Your Personal Soundtrack")
                .setDescription(`Your favorite tracks, all in one place.\n\n${list}`)
                .addFields(
                    {
                        name: "🎶 Collection",
                        value: `${userFavorites.length} song${userFavorites.length === 1 ? "" : "s"} saved`,
                        inline: true
                    },
                    {
                        name: "✨ Quick Actions",
                        value: "`/removeFavorite <number>`\n`/clearFavorites`",
                        inline: true
                    }
                )
                .setFooter({
                    text: "Reply to a song message with /saveFavorite to add more"
                });

            await message.reply({ embeds: [embed] });
            return;
        }

        if (content.startsWith("/removeFavorite")) {
            const userId = message.author.id;
            const number = content.slice("/removeFavorite".length).trim();
            if (!/^[1-9]\d*$/.test(number)) {
                return message.reply(
                    "Use /removeFavorite <number> with a number from /viewFavorites."
                );
            }

            const userFavorites = favorites.get(userId) || [];
            const index = Number(number) - 1;
            if (index >= userFavorites.length) {
                return message.reply("That number isn't in your favorites list.");
            }

            const [removedSong] = userFavorites.splice(index, 1);
            if (userFavorites.length === 0) favorites.delete(userId);
            return message.reply(`Removed ${removedSong} from your favorites.`);
        }

        if (content === "/clearFavorites") {
            const userId = message.author.id;
            if (!favorites.has(userId) || favorites.get(userId).length === 0) {
                return message.reply("Your favorites list is already empty.");
            }

            favorites.delete(userId);
            return message.reply("Your favorites list has been cleared.");
        }

        if (content !== "/saveFavorite") return;

        const replyId = message.reference?.messageId;

        if (!replyId) {
            return message.reply(
                "Reply to one of my song messages with /saveFavorite to save it."
            );
        }

        let originalMessage;
        try {
            originalMessage = await message.channel.messages.fetch(replyId);
        } catch (error) {
            console.error("Failed to fetch the replied-to message for a favorite:", error);
            return message.reply(
                "I couldn't read that message. Make sure I have permission to read the channel history."
            );
        }

        if (!originalMessage?.author) {
            return message.reply("I couldn't read the message you replied to.");
        }

        if (!originalMessage.author.bot) {
            return message.reply("You can only save a song message sent by this bot.");
        }

        if (originalMessage.author.id !== message.client.user.id) {
            return message.reply("You can only save a song message sent by this bot.");
        }

        const song = getSongFromMessage(originalMessage);
        if (!song.trim()) {
            return message.reply(
                "I couldn't find a song title in that message. Reply to a song result and try again."
            );
        }

        const userId = message.author.id;
        const userFavorites = favorites.get(userId) || [];
        const normalizedSong = normalizeSong(song);
        // Check only this user's list so equivalent titles cannot be saved twice.
        if (userFavorites.some((favorite) => normalizeSong(favorite) === normalizedSong)) {
            return message.reply("That song is already in your favorites.");
        }

        userFavorites.push(song);
        favorites.set(userId, userFavorites);
        await message.reply("Added to your favorites!");
        // End of command handling: successful saves are confirmed here, while
        // other supported paths return after sending their response.
    }
};

export default event;
export { favorites };