const db = require('quick.db');
const Server = require("./server");

class Database {

    constructor() {
        this.name = "test";
    }
    get = db.get
    delete = db.delete
    set = db.set
    table = db.table

    defaultGuild(guild)
    {
        let server = new Server(guild);
        db.set(guild.id, server);
    }

    changePrefix(serverID, prefix)
    {
        let server = db.get(serverID);
        server.prefix = prefix;
        db.set(serverID, server);
        console.log("Prefix changed to " + prefix);
        console.log(db.get(serverID))
    }
}


module.exports = Database;