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
    free = false;
    lastPaid = 0;
    constructor(guild)
    {
        this.serverId = guild.id;
        this.adminIds = [guild.ownerId];
    }
}


module.exports = Server;