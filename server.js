const process = require('node:process');
const http = require("node:http");

const express  = require("express");
const socketIO = require("socket.io");

function logSocket(socket) {
    console.log(`  id: ${socket.id}`);
    console.log(`  handshake.address: ${socket.handshake.address}`);
    console.log(`  handshake.url: ${socket.handshake.url}`);
    console.log(`  transport: ${socket.conn.transport.name}`);
}

function main(argv) {
    const port = parseInt(argv[2]);

    const app = express();
    const server = http.createServer(app);
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
    });

    server.listen(port, () => {
        console.log(`server running at http://localhost:${port}`);
      });
}

if (require.main === module)
    main(process.argv);