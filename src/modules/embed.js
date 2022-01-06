const Discord = require('discord.js');

class discordEmbed {
    constructor(title,colour = "F3FF00") {
      this.embed = new Discord.MessageEmbed()
        .setColor(colour)
        .setTitle(title)
        .setTimestamp()
        .setFooter({text:"Tom - Tоm#9216",iconURL:"https://cdn.discordapp.com/avatars/148757658873233408/5725ade7f14d8c81c0c19a491974fcca.webp"})
        .setAuthor({name:"Timetable Bot"});
    }
}

module.exports = discordEmbed;