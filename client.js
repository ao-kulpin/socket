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

    let waitLine = true;
    function logIfNeeded() {
      if(rl.line == "" && delayedMessages.length > 0) {
        if (waitLine)
          console.log("\n");

        logMessages();

        if (waitLine)
          rl.prompt();
      }
    }

    socket.on("server", (msg) => {
      storeMesssage(`===> Recieved from ${server}: ${msg}`);
      logIfNeeded();
    });

    socket.on("disconnect", (reason) => {
      storeMesssage(`*** disconnect event, reason: ${reason} socket: ${socket.id} ***`);
      logIfNeeded();
    });

    for(const es of ["connect", "connect_error"])
      socket.on(es, (reason) => {
        storeMesssage(`*** ${es} event socket: ${socket.id} ***`);
        logIfNeeded();
      });      

    rl.prompt();  
    for await(const clientMsg of rl) {
      waitLine = false;

      logMessages();

      if(!clientMsg)
        break;

      try {
        await socket.timeout(2000).emitWithAck("client", clientMsg);
        console.log(`<=== sent to ${server}: ${clientMsg}`);
      }
      catch(err) {
        console.log(`*** Server fails msg: (${clientMsg}) / err: ${err.message} ***`);
      }
      rl.prompt();
      waitLine = true;
    }

    rl.close();
    socket.off();
    socket.disconnect();
    console.log("The End of the Client")
}

if (require.main === module)
   main(process.argv);