const Discord = require("discord.js");
const moment = require("moment");
const fs = require("fs");

const Timetables = require('./timetables');
const DiscordEmbed = require('./embed');
const Site = require('./site');

class Bot
{
    superadmin = false;
    constructor(db)
    {
        this.db = db;
        this.client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.DIRECT_MESSAGES] , partials: ['MESSAGE', 'CHANNEL', 'REACTION']});
        this.client.login(process.env.TOKEN)
        this.client.on("messageCreate", message => this.onMessage(message));
        this.client.on("guildCreate", guild => this.onGuildCreate(guild));
        this.client.on("ready", () => this.onReady());
        this.site = new Site(this.client,db);
        this.timetables = new Timetables(this.client,db);
    }

    async onReady()
    {
        console.log(`Logged in as ${this.client.user.tag}!`);
        this.timetables.updateTimetables()
    }

    async onMessage(message)
    {
        if(message.type == "CHANNEL_PINNED_MESSAGE")
        {
            if(message.author.id == this.client.user.id && message.deletable) message.delete();
        }
        if(message.author.bot) return;
        if(message.channel.type == "DM")
        {
            if(message.content.includes("config"))
            {
                let token = this.site.generateToken(message.author.id)
                message.author.send(`You can configure your timetable here \nhttps://time.tomsteer.me/config?token=${token}`)
            }else if(message.content.includes("update"))
            {
                this.timetables.updateTimetables()
                message.author.send("Only the config command works in DMs!")
            }
            else if(message.content.includes("superadmin"))
            {
                if(message.author.id == "148757658873233408")
                {    
                    this.superadmin = !this.superadmin;
                    message.author.send("Super Admin :" + this.superadmin.toString());
                }
                message.author.send("Only the config command works in DMs!")
            }
            else
            {
                message.author.send("Only the config command works in DMs!")
            }
            return
        }
        let prefix = await this.getServerPrefix(message.guild.id);
        if(message.content.substring(0,prefix.length) == prefix)
        {
            let args = message.content.split(" ");
            let command = args.shift().slice(prefix.length).toLowerCase();
            switch(command)
            {
                case "ping":
                    message.channel.send('Loading data').then (async (msg) =>{
                        msg.edit(`🏓Latency is ${msg.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(this.client.ws.ping)}ms`);
                      })
                break;

                case "config":
                    if(message.deletable)message.delete()
                    let token = this.site.generateToken(message.author.id)
                    message.author.send(`You can configure your timetable here \nhttps://time.tomsteer.me/config?token=${token}`)
                break;

                case "settings":
                    let setting = args.shift();
                    switch(setting)
                    {
                        case "prefix":
                            var adminIds = await this.getAdminIds(message.guild.id)
                            if(!adminIds.includes(message.author.id) && (message.author.id != "148757658873233408"))
                            {
                                message.channel.send("You are not the admin!");
                            }else
                            {
                                let oldPrefix = prefix;
                                prefix = args[0];
                                if(prefix != null)
                                {
                                    this.db.changePrefix(message.guild.id, prefix);
                                    message.channel.send(`Changed prefix from ${oldPrefix} to ${prefix}`);
                                }else
                                {
                                    message.channel.send(`The current prefix is ${oldPrefix}`);
                                }
                            }
                        break;

                        case "admins":
                            var adminIds = await this.getAdminIds(message.guild.id)
                            if(!adminIds.includes(message.author.id) && (message.author.id != "148757658873233408"))
                            {
                                message.channel.send("You are not the admin!");
                            }else
                            {
                                let operator = args.shift();
                                let user = message.mentions.users.first();
                                if(operator != null && user != null)
                                {
                                    switch(operator)
                                    {
                                        case "add":
                                            if(adminIds.includes(user))
                                            {
                                                message.channel.send("User is already an admin!");
                                            }else
                                            {
                                                adminIds.push(user.id);
                                                this.setAdminIds(message.guild.id, adminIds);
                                                message.channel.send(`<@${user.id}> added to admin list!`);
                                                user.send(`You have been added to the admin list of ${message.guild.name}!`);
                                            }
                                        break;

                                        case "remove":
                                            if(!adminIds.includes(user.id))
                                            {
                                                message.channel.send("User is not an admin!");
                                            }
                                            else
                                            {
                                                if(adminIds.length == 1)
                                                {
                                                    message.channel.send("You can't remove the last admin!");
                                                }else
                                                {
                                                    adminIds.splice(adminIds.indexOf(user.id), 1);
                                                    this.setAdminIds(message.guild.id, adminIds);
                                                    message.channel.send(`<@${user.id}> removed from admin list!`);
                                                    user.send(`You have been removed from the admin list of ${message.guild.name}!`);
                                                }
                                            }
                                        break;
                                    }
                                }else
                                {
                                    message.channel.send(`Correct Usage: ${prefix}settings admins add/remove <user>`);
                                }
                            }
                        break;

                        case "members":
                            var members = await this.getMembers(message.guild.id)
                            var adminIds = await this.getAdminIds(message.guild.id)
                            if(!adminIds.includes(message.author.id) && (message.author.id != "148757658873233408"))
                            {
                                message.channel.send("You are not the admin!");
                            }else
                            {
                                let operator = args.shift();
                                let user = message.mentions.users.first();
                                if(operator != null && user != null)
                                {
                                    switch(operator)
                                    {
                                        case "add":
                                            if(members.includes(user.id))
                                            {
                                                message.channel.send("User is already on the timetable!");
                                            }else
                                            {
                                                args.shift();
                                                if(args.length > 0)
                                                {
                                                    members.push(user.id);
                                                    await this.setMembers(message.guild.id, members);
                                                    this.db.set(`${message.guild.id}.names.${user.id}`, args.join(" "));
                                                    message.channel.send(`<@${user.id}> added to the timetable!`);
                                                    user.send(`You have been added to the timetable of ${message.guild.name}!`);
                                                    this.timetables.checkForTimeTable(user)
                                                    this.timetables.updateGuild(message.guild);
                                                }else
                                                {
                                                    message.channel.send(`Correct Usage: ${prefix}settings members add <user> <name>`);
                                                }
                                            }
                                        break;

                                        case "remove":
                                            if(!members.includes(user.id))
                                            {
                                                message.channel.send("User is not on the timetable!");
                                            }
                                            else
                                            {
                                                members.splice(members.indexOf(user.id), 1);
                                                this.setMembers(message.guild.id, members);
                                                message.channel.send(`<@${user.id}> removed from the timetable!`);
                                                user.send(`You have been removed from the timetable of ${message.guild.name}!`);
                                            }
                                        break;
                                        
                                        case "rename":
                                            if(!members.includes(user.id))
                                            {
                                                message.channel.send("User is not on the timetable!");
                                            }else
                                            {
                                                args.shift();
                                                if(args.length > 0)
                                                {
                                                    this.db.set(`${message.guild.id}.names.${user.id}`, args.join(" "));
                                                    message.channel.send(`<@${user.id}> renamed to ${args.join(" ")}`);
                                                    user.send(`You have been renamed to ${args.join(" ")} in the timetable of ${message.guild.name}!`);
                                                    this.timetables.updateGuild(message.guild);
                                                }else
                                                {
                                                    message.channel.send(`Correct Usage: ${prefix}settings members add <user> <name>`);
                                                }
                                            }
                                        break;

                                    }
                                }else
                                {
                                    message.channel.send(`Correct Usage: ${prefix}settings members add/remove/rename <user>`);
                                }
                            }
                        break;

                        case "pingpong":
                            let state = args.shift();
                            if(state != null && (state == "on" || state == "off"))
                            {
                                this.db.set(`${message.guild.id}.pingpong`, state);
                                message.channel.send(`Pingpong set to ${state}!`);
                            }else
                            {
                                message.channel.send(`Correct Usage: ${prefix}settings pingpong <on/off>`);
                            }
                        break;
                        
                        default:
                            var settingsEmbed = new DiscordEmbed("Settings").embed
                            .setDescription(`
                            **${prefix}settings** - Shows this message
                            **${prefix}settings members add/remove/rename <user> <name>** - Adds or removes a user from the timetable
                            **${prefix}settings admins add/remove <user>** - Adds or removes a user from the admin list
                            **${prefix}settings prefix <prefix>** - Sets the prefix for the bot
                            **${prefix}settings pingpong on/off** - Enables or disables pingpong
                            `)
                            message.channel.send({embeds: [settingsEmbed]});

                        break;
                    }
                    
                break;

                case "setup":
                    var adminIds = await this.getAdminIds(message.guild.id)
                    if(!adminIds.includes(message.author.id) && !(message.author.id == "148757658873233408" && this.superadmin))
                    {
                        message.channel.send("You are not the admin!");
                    }else
                    {
                        var setup = new DiscordEmbed("Setup Embed").embed;
                        var embedMessage = await message.channel.send({embeds: [setup]});
                        var server = this.db.get(message.guild.id);
                        if(server == null)
                        {
                            await this.db.defaultGuild(message.guild);
                            server = await this.db.get(message.guild.id);
                        }
                        await this.client.channels.fetch(server.channelId).then(channel => channel.messages.fetch(server.messageId).then(async (msg) => {
                            if(msg.deletable)msg.delete();
                        })).catch(() => {});
                        server.channelId = message.channel.id;
                        server.messageId = embedMessage.id;
                        embedMessage.pin();
                        this.db.set(message.guild.id, server);
                        this.timetables.updateGuild(message.guild)
                        if(message.deletable)message.delete();
                    }
                break;

                case "update":
                    var server = this.db.get(message.guild.id);
                    if(server == null)
                    {
                        this.db.defaultGuild(message.guild);
                    }
                    this.timetables.updateGuild(message.guild)
                    if(message.deletable)message.delete();
                break;

                case "help":
                    var helpEmbed = new DiscordEmbed("Help").embed
                    .setDescription(`
                    **${prefix}help** - Shows this message
                    **${prefix}ping ** - Pings the bot
                    **${prefix}config** - Generates a config link
                    **${prefix}update ** - Updates the timetable
                    **${prefix}setup ** - Sets up the timetable
                    **${prefix}settings ** - Shows the settings  
                    `)
                    message.channel.send({embeds: [helpEmbed]});
                break;

                case "superadmin":
                    if(message.deletable)message.delete();
                    if(message.author.id == "148757658873233408")
                    {
                        this.superadmin = !this.superadmin;
                        message.author.send("Super Admin :" + this.superadmin.toString());
                    }
                break;

                case "free":
                    if(message.deletable)message.delete();
                    if(message.author.id == "148757658873233408")
                    {
                        var server = this.db.get(message.guild.id);
                        server.free = !server.free;
                        this.db.set(message.guild.id, server);
                        message.channel.send("Free : " + server.free.toString());
                    }
                break;

                case "paid":
                    if(message.deletable)message.delete();
                    if(message.author.id == "148757658873233408")
                    {
                        var server = this.db.get(message.guild.id);
                        server.lastPaid = Date.now();
                        this.db.set(message.guild.id, server);
                        message.channel.send("Last Paid : " + new Date(server.lastPaid).toLocaleString());
                    }
                break;

                case "deactivate":
                    if(message.deletable)message.delete();
                    if(message.author.id == "148757658873233408")
                    {
                        var server = this.db.get(message.guild.id);
                        server.lastPaid = 0
                        this.db.set(message.guild.id, server);
                        message.channel.send("Server Deactivated");
                    }
                break;

                case "info":
                    if(message.deletable)message.delete();
                    var server = this.db.get(message.guild.id);
                    var infoEmbed = new DiscordEmbed("Info",server.free == true || server.lastPaid + (60*60*24*20*1000) > Date.now()? "#00FF00" : "#FF0000").embed
                    .setDescription(`
                    **Status** : ${server.free == true || server.lastPaid + (60*60*24*20*1000) > Date.now()? "Active" : "Inactive"}
                    **Last Paid** : ${new Date(server.lastPaid).toLocaleString()}
                    **Next Due** : ${new Date(server.lastPaid + (60*60*24*20*1000)).toLocaleString()}
                    `)
                    if(server.free)
                    {
                        infoEmbed.setDescription(`
                        **Status** : Free
                        `);
                    }
                    message.channel.send({embeds: [infoEmbed]});
                break;
                
            }
        }else
        {
            this.logMessage(message);
            this.pingpong(message);
        }
    }

    async sendMessage(channelID,message)
    {
        let channel = await this.client.channels.fetch(channelID)
        console.log(channel)
    }

    async onGuildCreate(guild)
    {
        guild.systemChannel.send(`Hello! To get started, use !setup where you would like the timetable to be posted.`);
        this.db.defaultGuild(guild);
    }

    async getServerPrefix(serverID)
    {
        let server = await this.db.get(serverID);
        if(server != null)
        {
            return server.prefix;
        }else
        {
            let guild = await this.client.guilds.fetch(serverID)
            this.db.defaultGuild(guild);
            return "!";
        }
    }

    async getAdminIds(serverID)
    {
        let server = await this.db.get(serverID);
        if(server != null)
        {
            return server.adminIds;
        }else
        {
            let guild = await this.client.guilds.fetch(serverID)
            this.db.defaultGuild(guild);
            return [guild.ownerId];
        }
    }

    async setAdminIds(serverID, adminIds)
    {
        let server = await this.db.get(serverID);
        if(server != null)
        {
            server.adminIds = adminIds
            this.db.set(serverID, server);
        }else
        {
            let guild = await this.client.guilds.fetch(serverID)
            this.db.defaultGuild(guild);
        }
    }

    async getMembers(serverID)
    {
        let server = await this.db.get(serverID);
        if(server != null)
        {
            return server.members;
        }else
        {
            let guild = await this.client.guilds.fetch(serverID)
            this.db.defaultGuild(guild);
            return [];
        }
    }    

    async setMembers(serverID, members)
    {
        let server = await this.db.get(serverID);
        if(server != null)
        {
            server.members = members
            await this.db.set(serverID, server);
        }else
        {
            let guild = await this.client.guilds.fetch(serverID)
            await this.db.defaultGuild(guild);
        }
    }

    pingpong(message){
        if(this.db.get(`${message.guild.id}.pingpong`) == "on")
        {
            var messageContent = message.content.toLowerCase();
            var pingPongFile = fs.readFileSync("./resources/pingpong.txt", "utf8");
            pingPongFile = pingPongFile.split("\r\n");
            pingPongFile.forEach(line =>{
              let input = line.split(",");
              if(messageContent == input[0]){
                message.channel.send(input[1]);
                this.logEvent(message.content,message.author.tag);
                return false;
              }
            }); 
        } 
    }

    logEvent(log,author){
        let today = moment().format('MMMM Do  h:mm a');
        this.client.channels.fetch("764267930107641906").then(channel => channel.send(today + " | " + author +" | " + log));
    }

    logMessage(message){
        let attachments = [];
        message.attachments.map(MessageAttachment=>{
            attachments.push(MessageAttachment.attachment);
        });
        if(message.author.id == "148757658873233408"){
            this.client.channels.fetch("772192381830430732").then(channel => channel.send(message.guild.name + " | " + message.channel.name + " | " + message.author.username +" | " + message.content + " | " + attachments ));
        }else{
            this.client.channels.fetch("772192381830430732").then(channel => channel.send(message.guild.name + " | " + message.channel.name + " | <@" + message.author.id +"> | " + message.content + " | " + attachments ));
        }
    }

}

module.exports = Bot;