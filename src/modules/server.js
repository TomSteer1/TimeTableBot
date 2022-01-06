class Server
{
    serverId;
    adminIds = [];
    channelId;
    messageId;
    members = [];
    prefix = "!";
    names = {};
    free = false;
    lastPaid = 0;
    pingpong = "off";
    constructor(guild)
    {
        this.serverId = guild.id;
        this.adminIds = [guild.ownerId];
    }
}


module.exports = Server;