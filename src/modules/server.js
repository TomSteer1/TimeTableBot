class Server
{
    serverId;
    adminIds = [];
    channelId;
    messageId;
    members = [];
    setup = false;
    prefix = "!";
    names = {};
    constructor(guild)
    {
        this.serverId = guild.id;
        this.adminIds = [guild.ownerId];
    }
}


module.exports = Server;