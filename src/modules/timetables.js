const discordEmbed = require('./embed');
const fs = require('fs');

class Timetables
{
    constructor(client,db)
    {
        let classesData = fs.readFileSync("./resources/lessons.json")
        this.classes = JSON.parse(classesData)
        this.client = client;
        this.db = db;
        this.updateTimeout = setTimeout(this.updateTimetables.bind(this),60*60*1000)
        // this.updateTimetables();
    }


    async updateTimetables()
    {
        clearTimeout(this.updateTimeout)
        console.log("Updating timetables")
        let guilds =  await this.client.guilds.fetch();
        guilds.forEach(guild => {
            this.updateGuild(guild)
        });
        this.updateTimeout = setTimeout(this.updateTimetables.bind(this),60*60*1000)
    }

    async updateGuild(guild)
    {
        guild = await this.client.guilds.fetch(guild.id)
        let server = this.db.get(guild.id);
        if(server.channelId != undefined && server.messageId != undefined)
        {
            if(server.free == true || server.lastPaid + (60*60*24*20*1000) > Date.now())
            {
                if(server == null)
                {
                    this.db.defaultGuild(guild);
                }
                else if(server.channelId != null && server.messageId != null)
                {
                    let todaysTimetable = []
                    let tomorrowsTimetable = []
                    for(let i = 1; i <= 4 ; i++)
                    {
                        todaysTimetable[i] = []
                        tomorrowsTimetable[i] = []
                    }
                    let peopleList = server.members;
                    let dayNumber = new Date().getDay();
                    peopleList.forEach(userid => {
                        if(fs.existsSync(`./timetables/${userid}.json`))
                        {
                            let studentData = fs.readFileSync(`./timetables/${userid}.json`);
                            let student = JSON.parse(studentData);
                            student.name = server.names[userid];
                            let today = student.timetable[((dayNumber == 0)?7:dayNumber)]
                            let tomorrow = student.timetable[dayNumber + 1]
                            for(let i = 1; i <= 4 ; i++)
                            {
                                todaysTimetable[i].push({name:student.name,class: this.classes[today[i]]})
                                tomorrowsTimetable[i].push({name:student.name,class: this.classes[tomorrow[i]]})
                            }
                        }
                    })

                    for(let i = 1; i <= 4 ; i++)
                    {                      
                        todaysTimetable[i].sort((a,b) => {
                            if(a.name < b.name) return -1;
                            if(a.name > b.name) return 1;
                            return 0;
                        })
                        tomorrowsTimetable[i].sort((a,b) => {
                            if(a.name < b.name) return -1;
                            if(a.name > b.name) return 1;
                            return 0;
                        })
                    }

                    let todaysTimetableEmbed
                    let tomorrowsTimetableEmbed
                    let today = new Date()
                    let tomorrow = new Date()
                    tomorrow.setDate(today.getDate() + 1) 
                    let day = today.getDay()
                    if(day == 6 || day == 0 )
                    {
                        todaysTimetableEmbed = new discordEmbed("Today's Timetable","F3FF00").embed
                        todaysTimetableEmbed.addField("No one is in today","\u200B")
                    }else
                    {
                        todaysTimetableEmbed = new discordEmbed("Today's Timetable","F3FF00").embed
                        this.generateTimetableEmbed(todaysTimetableEmbed,todaysTimetable)
                    }
                    if(day == 5 || day == 6 )
                    {
                        tomorrowsTimetableEmbed = new discordEmbed("Tomorrow's Timetable","FB00FF").embed
                        tomorrowsTimetableEmbed.addField("No one is in tomorrow","\u200B")
                    }else
                    {
                        tomorrowsTimetableEmbed = new discordEmbed("Tomorrow's Timetable","FB00FF").embed
                        this.generateTimetableEmbed(tomorrowsTimetableEmbed,tomorrowsTimetable)
                    }

                    let extraEmbed = new discordEmbed("","0000FF").embed
                    extraEmbed.addField("All Study Periods",`[Open](https://time.tomsteer.me/whoisfree?id=${guild.id})`)

                    guild.channels.fetch(server.channelId).then(channel => channel.messages.fetch(server.messageId).then(message => message.edit({embeds :[tomorrowsTimetableEmbed,todaysTimetableEmbed,extraEmbed]})).catch(() => {}));
                }
            }else
            {
                let notPaidEmbed = new discordEmbed("Timetable","#FF0000").embed
                notPaidEmbed.addField("Please pay the subscription to continue using this bot","\u200B")
                guild.channels.fetch(server.channelId).then(channel => channel.messages.fetch(server.messageId).then(message => message.edit({embeds :[notPaidEmbed]})).catch(() => {}));
            }
        }
    }


    generateTimetableEmbed(embed,timetable)
    {
        timetable.forEach((period,index) => {
            let periodLessons = ""
            period.forEach(student=>{
                periodLessons += `${student.name} - ${student.class}\n`
            })
            if(periodLessons == "")periodLessons = "No one is in for this period"
            if(index == 3)embed.addField("\u200B","\u200B")
            embed.addField("**Period " + index + "**",periodLessons,true)
        })
    }

    checkForTimeTable(user)
    {
        if(!fs.existsSync(`./timetables/${user.id}.json`))
        {
            user.send("You don't have a timetable yet. Please use the command `config` to create one.")
        }
    }
}

module.exports = Timetables;