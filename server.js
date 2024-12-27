const process = require('node:process');
const http = require("node:http");
const https = require('node:https');
const fs = require('node:fs');

const express  = require("express");
const socketIO = require("socket.io");

function logProps(label, obj, _ident, _roots) {
    const ident = _ident == undefined ? 0: _ident;
    const roots = _roots == undefined ? []: _roots;
    let logStr = `${label}:`;
    if (obj && typeof obj == "object") {
        if (roots.includes(obj)) {
            console.log(`${logStr} *self*`);
        }
        else {
            console.log(`${logStr}=>`);
            for(const key in obj) {
                logProps(`${label}.${key}`, obj[key], ident + 1, [...roots, obj]);
            }
        }
    }
    else {
        console.log(`${logStr} ${typeof obj == "function" ? "function": obj}`);
    }
}

function logSocket(socket) {
//    logProps("socket", socket);  // super full info
    console.log(`  id: ${socket.id}`);
    console.log(`  handshake.address: ${socket.handshake.address}`);
    console.log(`  handshake.url: ${socket.handshake.url}`);
    console.log(`  transport: ${socket.conn.transport.name}`);
}

function main(argv) {
    const protocol = argv.length < 3 ? "http": argv[2];
    const host = argv.length < 4 ? "0.0.0.0" : argv[3];
    const port = argv.length < 5 ? 80 : parseInt(argv[4]);

    const options = {
        key: fs.readFileSync(
            "certbot/akulpin2.ru/privkey.pem"
        ),
        cert: fs.readFileSync(
            "certbot/akulpin2.ru/fullchain.pem"
        ),
    };

    const app = express();
    const server = (protocol == "https" ? https: http).createServer(options, app);
    const io = new socketIO.Server(server);

    io.on('connection', async (socket) => {
        const clientName = `addr: ${socket.handshake.address} url: ${socket.handshake.url}, id: ${socket.id}`;
        console.log("Client is connected:");
        logSocket(socket);
        
        socket.on('client', async (clientMsg, callback) => {
            const serverMsg = `(${clientName}): ${clientMsg}`;
            console.log(`emit(${serverMsg})`);
            io.emit('server', serverMsg);
            callback(undefined);
        });
        socket.on("disconnect", (reason) => {
            console.log(`*** Client is disconnected, reason: ${reason} socket: ${socket.id} ***`)
        });
    });

    server.listen(port, host, () => {
            console.log(`server is running at ${protocol}://${host}:${port}`);
    });
}

if (require.main === module)
    main(process.argv);