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

    // Operations
    const operators = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => a / b
    };

    // const command = "34+35";

    let operator;

    for (const op of Object.keys(operators)) {
        if (command.includes(op)) {
            operator = op;
            break;
        }
    }

    if (operator === undefined) {
        message.channel.send("Invalid operator");
    } else {
        const index = command.indexOf(operator);

        const num1 = Number(command.slice(0, index));
        const num2 = Number(command.slice(index + 1));

        if (operator === "/" && num2 === 0) {
            message.channel.send("Cannot divide by zero");
        } else {
            const result = operators[operator](num1, num2);

            message.channel.send(command + " = " + result);
        }
    }

    // if(command === '1+1')
    //     message.channel.send('1+1 is equal to 2')
    if(command === 'hello'){
        message.channel.send('world')
    }

}
);


client.login(process.env.DISCORD_TOKEN);
