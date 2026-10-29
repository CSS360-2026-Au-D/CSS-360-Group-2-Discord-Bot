
const event = {
  name: "ready",
  once: true,

  execute(client) {
    console.log(`Bot is online as ${client.user.tag}`);
    console.log("Currently connected to servers:");

    client.guilds.cache.forEach((guild) => {
      console.log(`- ${guild.name} (ID: ${guild.id})`);
    });
  },
};

export default event;