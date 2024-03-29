//("dotenv").config();
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const randomWordSlugs = require("random-word-slugs");
const { NONAME } = require("dns");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
let currentUserflag={};
let hostname={};
let rooms = {};
let roomWord = {};
const myMap = new Map();
io.on("connection", (socket) => {
  socket.on("createRoom", (username) => {
    const roomCode = generateRoomCode();
    hostname[roomCode] = username;
    socket.join(roomCode);
    roomWord[roomCode] = "";
    socket.emit("code", roomCode);
    rooms[roomCode] = {
      users: [{ id: socket.id, username, score: 0 }],
      messages: [],
      scoref: [],
      raws: [],
    };
    console.log(roomCode);
    if (rooms[roomCode]) {
      console.log("HEE");
    }
    io.to(roomCode).emit(
      "showmessage",
      rooms[roomCode].users.map((user) => user.username)
    );
    io.to(roomCode).emit(
      "updateUsers",
      rooms[roomCode].users.map((user) => user.username)
    );
    io.to(username.id).emit(
      "updateUsersDEL",
      rooms[roomCode].users.map((user) => user.username)
    );
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `${timestamp} - ${username} ----> Created This Room`;
    rooms[roomCode].messages.push(formattedMessage);
    io.to(roomCode).emit("updateMessages", rooms[roomCode].messages);
  });
  socket.on("canclear", (data) => {
    const { roomCode, username } = data;
    if (currentUserflag[roomCode]) {
      if (username == currentUserflag[roomCode].username)
        io.to(roomCode).emit("clearcanvas");
    }
  });
  socket.on("endgame", (roomCode) => {
    io.to(roomCode).emit("deleteall");
    delete rooms[roomCode];
  });
  socket.on("deldel", (data) => {
    const { roomCode, username } = data;
    io.to(roomCode).emit("deleteit", username);
  });
  socket.on("joinRoom", (data) => {
    const { roomCode, username } = data;
    if (rooms[roomCode]) {
      const userExists = rooms[roomCode].users.some(
        (user) => user.username === username
      );
      if (userExists) {
        socket.emit("roomError", "Already Entered,Change Username");
      } else {
        socket.join(roomCode);
        rooms[roomCode].users.push({ id: socket.id, username, score: 0 });
        io.to(roomCode).emit(
          "showmessage",
          rooms[roomCode].users.map((user) => user.username)
        );
        io.to(roomCode).emit(
          "updateUsers",
          rooms[roomCode].users.map((user) => user.username)
        );
        io.to(roomCode).emit(
          "updateUsersDEL",
          rooms[roomCode].users.map((user) => user.username)
        );
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `${timestamp} - ${username} ----> Has Joined`;
        rooms[roomCode].messages.push(formattedMessage);
        io.to(roomCode).emit("updateMessages", rooms[roomCode].messages);
      }
    } else {
      socket.emit("roomError", "Room not found");
    }
  });
  socket.on("updateScore", (data) => {
    const roomCode = data.roomCode;
    let username = data.username;
    let formattedMessage;
    io.to(roomCode).emit("clearscore");
    if (rooms[roomCode] != null) {
      rooms[roomCode].score = [];
      for (let i = 0; i < rooms[roomCode].users.length; i++) {
        if (rooms[roomCode].users[i].username == username)
          rooms[roomCode].users[i].score = rooms[roomCode].users[i].score + 0;
        formattedMessage = `${rooms[roomCode].users[i].username}: ${rooms[roomCode].users[i].score}`;
        rooms[roomCode].score.push(formattedMessage);
      }
    }
    io.to(roomCode).emit("newscore", rooms[roomCode].score);
  });
  socket.on("draw", (data) => {
    const { roomCode, username, coordinates } = data;
    console.log("$$$");
    console.log(currentUserflag[roomCode]);
    if (currentUserflag[roomCode]) {
      console.log(currentUserflag[roomCode].username);
      if (username == currentUserflag[roomCode].username)
        io.to(roomCode).emit("draw", { username, coordinates });
    }
  });
  socket.on("canv", (data) => {
    const { roomCode, username } = data;
    io.to(roomCode).emit("can-create", { username });
  });

  socket.on("down", (data) => {
    const { roomCode, username, coordinates } = data;
    io.to(roomCode).emit("ondown", { username, coordinates });
  });

  socket.on("sendMessage", (data) => {
    const { roomCode, username, message } = data;
    const timestamp = new Date().toLocaleTimeString();
    let formattedMessage = `${timestamp} - ${username}: ${message}`;
    if (roomWord[roomCode].toLowerCase() == message.toLowerCase()) {
      formattedMessage=`${timestamp} - ${username}: Guessed it correctly`;
    }
    myMap.set(message, username);
    rooms[roomCode].raws.push(message);
    rooms[roomCode].messages.push(formattedMessage);
    io.to(roomCode).emit("updateMessages", rooms[roomCode].messages);
    myMap.forEach((value, key) => {
      console.log(`${key} => ${value}`);
    });
  });

  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((roomCode) => {
      const index = rooms[roomCode].users.findIndex(
        (user) => user.id === socket.id
      );
      if (index !== -1) {
        rooms[roomCode].users.splice(index, 1);
        io.to(roomCode).emit(
          "updateUsers",
          rooms[roomCode].users.map((user) => user.username)
        );
        io.to(roomCode).emit(
          "updateUsersDEL",
          rooms[roomCode].users.map((user) => user.username)
        );
      }
    });
  });
  socket.on("startgame", (data) => {
    const { username, roomCode } = data;
    let t = 3;
    if (rooms[roomCode]) {
      console.log(rooms[roomCode].users.length);
      let currentIndex = 0;
      let guser;
      const waitturn = () => {
        io.to(roomCode).emit("clearcanvas");
        currentUserflag[roomCode] = null;
        io.to(roomCode).emit("changecurrentuser", currentUserflag[roomCode]);
        setTimeout(() => {
          startNextTurn(); // Start the next turn after a 5-second gap
        }, 5000);
      };
      const startturn = () => {
        setTimeout(() => {
          startNextTurn(); // Start the next turn after a 5-second gap
        }, 10000);
      };
      const startNextTurn = () => {
        if (currentIndex < rooms[roomCode].users.length) {
          const currentUser = rooms[roomCode].users[currentIndex];
          console.log(currentUser);
          console.log('##');
          currentUserflag[roomCode] = currentUser;
          io.to(roomCode).emit("changecurrentuser", currentUserflag[roomCode]);
          console.log(roomCode);
          console.log(currentUser.username);
          let slug = randomWordSlugs.generateSlug(1, {
            format: "title",
            partsOfSpeech: ["noun"],
            categories: {
              noun: ["animals", "food", "transportation", "sports"],
            },
          });
          roomWord[roomCode]=slug.toLowerCase();
          let remainingTime = 60;

          const timerInterval = setInterval(() => {
            if (remainingTime <= 0) {
              clearInterval(timerInterval);
              currentIndex++; // Move to the next user
              io.to(roomCode).emit("wordnword", {
                us1: currentUser.username,
                slug,
              });
              waitturn();
            } else {
              const minutes = Math.floor(remainingTime / 60);
              const seconds = remainingTime % 60;
              //console.clear(); // Clears the console to update the display
              console.log(`Time Remaining: ${minutes}m ${seconds}s`);
              io.to(roomCode).emit("timenword", {
                us1: currentUser.username,
                slug,
                minutes,
                seconds,
                currentIndex,
              });
              remainingTime--;
              for (let i = 0; i < rooms[roomCode].raws.length; i++) {
                if (
                  rooms[roomCode].raws[i].toLowerCase() == slug.toLowerCase() &&
                  myMap.get(rooms[roomCode].raws[i]) != currentUser.username
                ) {
                  guser = myMap.get(rooms[roomCode].raws[i]);
                  myMap.delete(rooms[roomCode].raws[i]);
                  // io.to(roomCode).emit("abrupt", {
                  //   guser,
                  //   slug,
                  // });
                  //clearInterval(timerInterval);
                  let formattedMessage;
                  io.to(roomCode).emit("clearscore");
                  if (rooms[roomCode] != null) {
                    rooms[roomCode].score = [];
                    for (let i = 0; i < rooms[roomCode].users.length; i++) {
                      if (rooms[roomCode].users[i].username == guser)
                        rooms[roomCode].users[i].score =
                          rooms[roomCode].users[i].score + remainingTime * 5;
                      formattedMessage = `${rooms[roomCode].users[i].username}: ${rooms[roomCode].users[i].score}`;
                      rooms[roomCode].score.push(formattedMessage);
                    }
                  }
                  io.to(roomCode).emit("newscore", rooms[roomCode].score);
                }
              }
            }
          }, 1000); // Update every 1000 milliseconds (1 second)
        } else {
          console.log("end");
          let winner = "No One";
          let wineerscore = 0;
          if (rooms[roomCode] != null) {
            //rooms[roomCode].score = [];
            for (let i = 0; i < rooms[roomCode].users.length; i++) {
              if (rooms[roomCode].users[i].score > wineerscore) {
                winner = rooms[roomCode].users[i].username;
                wineerscore = rooms[roomCode].users[i].score;
              }
            }
            io.to(roomCode).emit("showontitle", winner);
            t--;
            if (t) {
              currentIndex = 0;
              startturn();
            } else io.to(roomCode).emit("showontitleend", winner);
          }
        }
      };
      let formattedMessage;
      io.to(roomCode).emit("clearscore");
      if (rooms[roomCode] != null) {
        rooms[roomCode].score = [];
        for (let i = 0; i < rooms[roomCode].users.length; i++) {
          if (rooms[roomCode].users[i].username == guser)
            rooms[roomCode].users[i].score =
              rooms[roomCode].users[i].score + remainingTime * 5;
          formattedMessage = `${rooms[roomCode].users[i].username}: ${rooms[roomCode].users[i].score}`;
          rooms[roomCode].score.push(formattedMessage);
        }
      }
      io.to(roomCode).emit("newscore", rooms[roomCode].score);
      io.to(roomCode).emit("startturn");
      socket.emit("rev");
      // Start the first turn
      startturn();
    }
  });
});

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
