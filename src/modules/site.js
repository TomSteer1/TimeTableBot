const bodyParser = require("body-parser");
const express = require("express")
const app = express();
const fs = require("fs")
CryptoJS = require("crypto-js");
let db;
let client;
let tokens;
let lessonsData = JSON.parse(fs.readFileSync("./resources/lessons.json").toString())
lessons = []
for(let i = 0; i < lessonsData.total; i++)
{
    lessons[i] = lessonsData[i]
}
lessonString = "[\"" + lessons.join("\",\"") + "\"]"

app.use(express.static("public"))
app.use(bodyParser.urlencoded({
    extended: true
  }))
app.get("/config",(req,res)=>
{
    if(checkToken(req.query.token))
    {
        let result = tokens.get(req.query.token);
        if(fs.existsSync(`./timetables/${result.id}.json`))
        {
            let data = JSON.parse(fs.readFileSync(`./timetables/${result.id}.json`))
            let classes = ""
            for(let i =1; i <=5;i++)
            {
                let day = data["timetable"][i]
                for(let x = 1;x<=4;x++)
                {
                    classes += day[x] + "|"
                }
            }
            if(req.query.classes == classes)
            {
                let file = fs.readFileSync("./site/modify.html").toString();
                file = file.replace("##CLASSES##",lessonString)
                res.send(file)
            }else
            {
                res.redirect(`/config?token=${req.query.token}&classes=${classes}`)
            }
        }else
        {
            let file = fs.readFileSync("./site/config.html").toString();
            file = file.replace("##CLASSES##",lessonString)
            res.send(file)
        }
    }else
    {
        res.status(403).send((req.query.token == undefined?"A token needs to be supplied <br>Message Tom on discord if you need help":"Invalid Token <br>Try create a new token with !config <br>Message Tom on discord if you need help"))
    }
})

app.post("/uploadTimetable",(req,res)=>
{
    if(checkToken(req.body.token))
    {
        res.redirect('/thanks');
        tokens.set(`${req.body.token}.used`,true)
        let token = tokens.get(`${req.body.token}`)
        createStudent(req.body,token.id)
    }else
    {
        res.sendStatus(403)
    }
})

app.get("/inandfree",(req,res)=>
{
    let guildID = req.query.id;
    if(guildID != undefined)
    {
        let periodNames = ["Period 2","Lunch","Period 3"]
        let server = db.get(guildID)
        if(server != undefined)
        {
            let week = []
            for(let i = 1;i<=5;i++)
            {
                week[i] = []
                week[i][0] = []
                week[i][1] = []
                week[i][2] = []
            }
            server.members.forEach(id => {
                if(fs.existsSync(`./timetables/${id}.json`))
                {
                    let studentData = fs.readFileSync(`./timetables/${id}.json`);
                    let student = JSON.parse(studentData);
                    for(let i = 1;i<=5;i++)
                    {
                        let timetable = student.timetable[i]
                        if(timetable[1] != 0 && timetable[2] == 0 &&(timetable[3] != 0 || timetable[4] != 0))
                        {
                            week[i][0].push(server.names[id])
                        }
                        
                        if((timetable["1"] != 0 || timetable["2"] != 0 )&&(timetable["3"] != 0 || timetable["4"] != 0))
                        {
                            week[i][1].push(server.names[id])
                        }
                        if(timetable[4] != 0 &&timetable[3] == 0 &&(timetable[1] != 0 || timetable[2] != 0))
                        {
                            week[i][2].push(server.names[id])
                        }
                    }
                }
            })
            let html = ""
            for(let p = 0;p<=2;p++)
            {
                let dayHTML = `<tr><td style="color:white">${periodNames[p]}</td>`
                for(let d = 1;d<=5;d++)
                {
                    dayHTML += `<td class=day${d}>${week[d][p].join("<br>")}</td>`
                }
                html += dayHTML + "</tr>"
            }
            let rawHTML = fs.readFileSync("./site/inandfree.html").toString()
            rawHTML = rawHTML.replace("##HERE##",html)
            res.send(rawHTML)
        }else
        {
            res.send("No server found")
        }
    }
    else
    {
        res.send("No ID Supplied");
    }
    
})

app.get("/whoisfree",(req,res)=>{
    let guildID = req.query.id;
    if(guildID != undefined)
    {
        let server = db.get(guildID)
        if(server != undefined)
        {
            let week = []
            for(let d = 1; d <=5;d++)
            {
                week[d] = []
                for(let p = 1;p<=4;p++)
                {
                    week[d][p] = []
                }
            }
            server.members.forEach(id => {
                if(fs.existsSync(`./timetables/${id}.json`))
                {
                    let studentData = fs.readFileSync(`./timetables/${id}.json`);
                    let student = JSON.parse(studentData);
                    for(let d = 1; d <=5;d++)
                    {
                        for(let p = 1;p<=4;p++)
                        {
                            if(student.timetable[d][p] == 0)
                            {
                                week[d][p].push(server.names[id])
                            }
                        }
                    }
                }
            })
            let html = ""
            for(let i = 1;i <=4;i++)
            {
                let dayHTML = `<tr>`
                for(let x = 1 ; x <=5;x++)
                {
                    dayHTML += `<td class=day${x}>${week[x][i].join("<br>")}</td>`
                }
                html+= dayHTML + "</tr>"
            }
            let blankFile = fs.readFileSync("./site/free.html").toString()
            blankFile = blankFile.replace("##HERE##",html)
            res.send(blankFile)
        }else
        {
            res.send("No server found");
        }
    }else
    {
        res.send("No ID Supplied");
    }
})


async function createStudent(body,id)
{
    let studentData = fs.readFileSync(`./resources/Template.json`);
    let student = JSON.parse(studentData);
    let user  = await client.users.fetch(id);
    user.send(`Thanks for filling in your timetable`);
    student.name = user.username;
    let days = ["monday","tuesday","wednesday","thursday","friday"]
    for(let day = 1; day <= 5;day++)
    {
        for(let period = 1;period <= 4;period++)
        {
            student.timetable[day][period] = body[`${days[day -1]}${period}`]
        }
    }
    
    fs.writeFileSync(`./timetables/${id}.json`,JSON.stringify(student,null,"\t"))
    client.users.fetch("148757658873233408").then(user => 
    {
        user.send({files:[`./timetables/${id}.json`]});
    })
}

function checkToken(token)
{
    let valid = false
    if(token != undefined)
    {
        valid = tokens.get(`${token}.used`) == false
    }
    return valid
}


class Site
{
    constructor(bot,database) {
        db = database;
        tokens = new db.table("tokens")
        client = bot
        app.listen(80);
    }

    generateToken(id)
    {
        let oldToken = tokens.get(id)
        if(oldToken)
        {
            tokens.delete(`${oldToken}`)
        }
        let token = CryptoJS.SHA256(id + "fuckOffHarri" + Date.now()).toString()
        tokens.set(token,{id:id,used:false})
        tokens.set(id,token)
        return token
    }

}

module.exports = Site