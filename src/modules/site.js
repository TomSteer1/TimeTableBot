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