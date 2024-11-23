const process = require('node:process');
const readline = require('node:readline');

const prompt = require('prompt-sync')();
const { io } = require("socket.io-client");


async function main(argv) {
    const server = argv[2];

    const manager = new io.Manager(server);
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

    socket.on("server", (msg) => {
      console.log(`Recieved fom ${server}: ${msg}`);
      rl.prompt();
    });

    rl.prompt();
    if (!connect_error)
      for await (const msg of rl) {
        if (connect_error)
            break;

        if (!msg)
            break;

        try {
          await socket.timeout(2000).emitWithAck("client", msg);
          console.log(`${msg} is emitted to ${server}`);
        }
        catch(err) {
          console.log(`Server fails: ${err.message}`);
        }
        rl.prompt();
      }
    rl.close();
    socket.disconnect();
    console.log("The End")
}

if (require.main === module)
   main(process.argv);