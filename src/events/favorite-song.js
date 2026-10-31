const favorites = new Map();

const event = {
    name: "messageCreate",

    async execute(message) {
        if (message.author.bot) return;
        const content = message.content.trim();

        //add the viewFavorites

        if (content === "/viewFavorites") {
            const userId = message.author.id;
            const userFavorites = favorites.get(userId) || [];
            if (userFavorites.length === 0) {
        await message.reply("You have no favorite songs yet!");
        return;
    } 

    const list = userFavorites
        .map((song, index) => `${index + 1}. ${song}`)
        .join("\n");

    await message.reply(`Your favorite songs:\n${list}`);
    return;
}

        //stop the bot if the message is not saveFavorite

        if(content !== "/saveFavorite") return;
        const userId =message.author.id;

        if (!favorites.has(userId)) {
            favorites.set(userId, []);
        }
        const userFavorites = favorites.get(userId);
        const replyId= message.reference?.messageId;
        if (!replyId) {
            return;
        }
        const originalMessage = await message.channel.messages.fetch(replyId);
        if (!originalMessage.author.bot) {
            return;
        }

        if (originalMessage.author.id !== message.client.user.id) {
            return;
        }
        const song = originalMessage.content;
        if (!song.trim()) {
            return;
        }
        userFavorites.push(song);

        await message.reply ("Added to your favorites!");

    }
};
export default event;
export {favorites };
