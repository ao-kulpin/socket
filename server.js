const process = require('node:process');
const http = require("node:http");

const express  = require("express");
const socketIO = require("socket.io");


function main(argv) {
    const port = parseInt(argv[2]);

    const app = express();
    const server = http.createServer(app);
    const io = new socketIO.Server(server);

    io.on('connection', async (socket) => {
        const clientName = `${socket.handshake.address}(${socket.handshake.url}, id: ${socket.id})`;
        console.log(`Client ${clientName} connected`);
        
        socket.on('client', async (clientMsg, callback) => {
            const serverMsg = `${clientName}: ${clientMsg}`;
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