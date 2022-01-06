const Discord = require('discord.js');

class discordEmbed {
    constructor(title,colour = "F3FF00") {
      this.embed = new Discord.MessageEmbed()
        .setColor(colour)
        .setTitle(title)
        .setTimestamp()
        .setFooter({text:"Tom - Tоm#9216"});
    }
}

module.exports = discordEmbed;