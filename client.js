const process = require('node:process');
const readline = require('node:readline');

const prompt = require('prompt-sync')();
const { io } = require("socket.io-client");


async function main(argv) {
    const server = argv[2];
    const transport = argv.length < 4 ? "polling" : argv[3];

    const manager = new io.Manager(server, { transports: [transport] });
    const socket = manager.socket("/");

    let connect_error = false;    
    const connectPromise = new Promise((resolve, reject) => {
      let done = false;

      const timerId = setTimeout(() => {
        console.log("+++++ timeout");
        if (!done) {
          done = true;
          clearTimeout(timerId);
          reject(new Error("connection timeout"));
        }
      }, 2000);

      socket.on("connect_error", (err) => {
        console.log(`connect_error due to ${err.message}`);
        connect_error = true;
        if (!done) {
          done = true;
          clearTimeout(timerId);
          reject(err);
        }
      });

      socket.on("connect", ()=> {
        console.log(`Connected to ${server} socket ${socket.id}`);
        connect_error = false;
        if (!done) {
          done = true;
          clearTimeout(timerId);
          resolve(socket);
        }
      });
    });

    try {
      await connectPromise;
    }
    catch(err) {
      console.log(`***** Can't connect to ${server}: ${err.message}`);
      socket.close();
      return;
    }

    socket.off();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "your message> ",
    });

    const delayedMessages = [];

    function storeMesssage(msg) {
      delayedMessages.push(msg);
    }

    function logMessages() {
      while (delayedMessages.length > 0)
        console.log(delayedMessages.shift());
    }

    socket.on("server", (msg) => {
      storeMesssage(`Recieved fom ${server}: ${msg}`);
    });

    socket.on("disconnect", (reason) => {
      storeMesssage(`*** disconnect event, reason: ${reason} socket: ${socket.id} ***`)
    });

    for(const es of ["connect", "connect_error"])
      socket.on(es, (reason) => {
        storeMesssage(`*** ${es} event socket: ${socket.id} ***`)
      });
  
    rl.prompt();
    for await (const msg of rl) {
        logMessages();

        if (connect_error || !msg)
            break;

        try {
          await socket.timeout(2000).emitWithAck("client", msg);
          console.log(`msg: ${msg} is emitted to ${server}`);
        }
        catch(err) {
          console.log(`*** Server fails msg: ${msg} / err: ${err.message} ***`);
        }
        rl.prompt();
      }
    rl.close();
    socket.disconnect();
    console.log("The End")
}

if (require.main === module)
   main(process.argv);