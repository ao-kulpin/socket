const process = require('node:process');
const readline = require('node:readline');

const prompt = require('prompt-sync')();
const { io } = require("socket.io-client");


async function main(argv) {
    const server = argv[2];

    const socket = io(server, {
        ackTimeout: 1000,
        retries: 3,
      });

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
        console.log(`Connected to ${server}`);
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


//    let run = true;
//    while(run) {
    rl.prompt();
    if (!connect_error)
      for await (const msg of rl) {
        if (connect_error)
            break;

        if (!msg)
            break;
        console.log(msg);
        console.log(`timeout: ${socket.io.timeout()}`);
        socket.timeout(1000).emit("client", msg, 
          (err, val) => {
            if (err)
              console.log(`Server fails: ${err}`);
            else
              console.log(`Server succeed: ${val} msg: ${msg}`);
          }
        );
//        try {
//          await socket.timeout(100).emitWithAck("client", msg);
//        }
//        catch(err) {
//          console.log(`Server fails: ${err.message}`);
//        }
        rl.prompt();
      }
    rl.close();
    socket.disconnect();
    console.log("The End")
}

if (require.main === module)
   main(process.argv);