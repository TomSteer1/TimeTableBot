const Database = require('./modules/database');
const db = new Database();


const Bot = require('./modules/discord');
const client = new Bot(db);

process.on('unhandledRejection', error => {
	console.log(error)
});