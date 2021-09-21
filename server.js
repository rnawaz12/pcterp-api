const mongoose = require('mongoose');
const app = require('./app');
const dotenv = require('dotenv');
var ip = require('ip');

// This will wait for any un caught exception, if any un catch exception happen it will
// write the log and then crash the application.
process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

// Setting the config file in dotenv so that we can access config key from all the files
dotenv.config({ path: './config.env' });

// Connecting to the local mongo db, it require connection string, which is must be stored in config.env file
mongoose.connect(process.env.DATABASE_LOCAL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}).then(con => console.log('DB Connection Successfull!'));

console.log();

// Creating the server, which host on the local IP Server.
const port = process.env.PORT || 2020;
const host = process.env.HOST || '192.168.0.107';
const server = app.listen(port, host, () => {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port);
});

// This will wait for any unhandle rejection exception happen, if so then it will logged the exception and 
// then crash the application.
process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});