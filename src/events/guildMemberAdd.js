require('dotenv').config();

const Discord = require('discord.js');

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent
    ]
});
const prefix = '/';

client.once('ready', ()=>
{
    console.log('bot is online');
}

);


client.on('messageCreate', message=>{

    if(!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if(command === '1+1')
        message.channel.send('1+1 is equal to 2')
    if(command === 'hello'){
        message.channel.send('world')
    }

}
);


client.login(process.env.DISCORD_TOKEN);
