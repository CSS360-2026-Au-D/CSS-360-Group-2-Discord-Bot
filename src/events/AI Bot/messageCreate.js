// import ollama from 'ollama';
// require('dotenv').config();

// const Discord = require('discord.js');

// const client = new Discord.Client({
//     intents: [
//         Discord.GatewayIntentBits.Guilds,
//         Discord.GatewayIntentBits.GuildMessages,
//         Discord.GatewayIntentBits.MessageContent
//     ]
// });


import 'dotenv/config';
import ollama from 'ollama';
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});


const prefix = '/ai ';

client.once('ready', ()=>
{
    console.log('bot is online');
}

);



async function askAI(inp){
    const response = await ollama.chat({
    model: 'llama3.1',
    messages: [{ role: 'user', content: inp }],
    })
    // console.log(response.message.content)

    return response.message.content;
}


client.on('messageCreate', async message=>{

    if(!message.content.startsWith(prefix)) return;

    // const args = message.content.slice(prefix.length).split(/ +/);
    // const command = args.shift().toLowerCase();

    const command = message.content.slice(prefix.length).trim();


    const outputAI = await askAI(command);
    
    
    if(command === 'hello'){
        await message.channel.send('world');
        return;
    }


    // await message.channel.send(outputAI);

    // new code
    try {
        // Show Discord typing indicator
        await message.channel.sendTyping();

        // Ask Ollama
        const outputAI = await askAI(command);

        // Send AI response
        await message.channel.send(outputAI);

    } catch (error) {
        console.error(error);
        await message.channel.send('AI encountered an error!');
    }



}
);


client.login(process.env.DISCORD_TOKEN);
