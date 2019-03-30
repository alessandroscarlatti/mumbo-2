/*********************************************
 * Backend console startup.
 *********************************************/
const BANNER = String.raw`             
 __  __            _            _ ___  
|  \/  |_  _ _ __ | |__  ___ _ | / __| 
| |\/| | || | '  \| '_ \/ _ \ || \__ \ 
|_|  |_|\_,_|_|_|_|_.__/\___/\__/|___/ 
`;
console.log(BANNER);
console.log(`Starting server PID ${process.pid} with args: ${process.argv}`);

const os = require("os");
const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;
const mumbo = require("./mumbo");
const SocketServer = mumbo.require('ws').Server;
const express = mumbo.require('express');
const MessageBus = require("./messageBus");

// https://gist.github.com/6174/6062387
// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
const SERVER_KEY = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// define generic routes.
const app = express();
// resources
app.use(`/static`, express.static(path.join(__dirname, "static")));

// the root path should only be authorized if the correct server key is given.
app.get("/", function (req, res) {
    if (req.query.k === SERVER_KEY)
        res.sendFile(path.join(__dirname, "static", "index.html"));
    else
        res.sendStatus(401);
});

// start express server on a random open port
// then open Chrome in app mode to the index.html page.
const server = app.listen(0);
server.on("listening", function () {
    const hostname = os.hostname();
    const port = server.address().port;
    const url = `http://${hostname}:${port}?k=${SERVER_KEY}`;
    console.log(`Server started at ${url} on ${new Date()}`);
    spawn("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", [url] /*["--window-size=500,500", `--app=${url}`]*/, {
        detached: true  // we don't want chrome to crash if our app crashes!
    })
});

/***********************************************
 * Application specific functions.
 ***********************************************/
const AppClass = require("./app");

/****************************************************************
 * WebSocket connection.
 * Build WebSocket connection so that frontend can connect
 * to this backend.
 ****************************************************************/
//init Websocket ws and handle incoming connect requests
const wss = new SocketServer({server, path: `/ws/${SERVER_KEY}`});
const clients = [];
let shutdownTimer;

function optionallyShutdownServer() {
    // need to check if canceled
    if (clients.length === 0) {
        console.log("No Clients connected. Shutting down now.");
        process.exit(0);
    }
}

wss.on('connection', function connection(ws, req) {

    console.log("Connected to client at " + req.connection.remoteAddress);
    clients.push(1);

    let messageBus = new MessageBus();
    messageBus.send = message => {
        try {
            ws.send(message);
        } catch (e) {
            console.log(e);
        }
    };

    // connect the application-specific functions
    messageBus.subscriber = new AppClass();

    ws.on('message', function incoming(message) {
        console.log("received message...", message);

        try {
            messageBus.receive(message);
        } catch (e) {
            console.log(e);
        }
    });

    // we only want this
    ws.on('close', function (code, reason) {
        console.log(`Connection closed with ${req.connection.remoteAddress}. Code: ${code}`);
        clients.pop();

        // if any previously closed connection is counting down, cancel it.
        clearTimeout(shutdownTimer);
        shutdownTimer = setTimeout(optionallyShutdownServer, 1000);
    });
});