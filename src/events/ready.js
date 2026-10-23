
const event = {
  name: "ready",
  once: true,

  execute(client) {
    console.log(`
    ############################################################
    #  Logged in as ${client.user.username}!
    #  Serving ${client.guilds.cache.size} servers.
    #  Serving ${client.users.cache.size} users.
    ############################################################
    `);

    // Show all servers the bot is currently connected to
    console.log("Connected Discord Servers:");

    client.guilds.cache.forEach((guild) => {
      console.log(`- ${guild.name} (ID: ${guild.id})`);
    });
  },
};

export default event;