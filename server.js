const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const randomWordSlugs = require("random-word-slugs");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const rooms = {};
const delayInMilliseconds = 3000;
let rounds = {};
const myMap = new Map();
io.on("connection", (socket) => {
  socket.on("createRoom", (username) => {
    const roomCode = generateRoomCode();
    socket.join(roomCode);
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
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `${timestamp} - ${username} ----> Created This Room`;
    rooms[roomCode].messages.push(formattedMessage);
    io.to(roomCode).emit("updateMessages", rooms[roomCode].messages);
  });

  socket.on("joinRoom", (data) => {
    const { roomCode, username } = data;
    if (rooms[roomCode]) {
      const userExists = rooms[roomCode].users.some(
        (user) => user.username === username
      );
      if (userExists) {
        socket.emit("roomError", "Already Entered");
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
    io.to(roomCode).emit("draw", { username, coordinates });
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
    const formattedMessage = `${timestamp} - ${username}: ${message}`;
    myMap[message] = username;
    rooms[roomCode].raws.push(message);
    rooms[roomCode].messages.push(formattedMessage);
    io.to(roomCode).emit("updateMessages", rooms[roomCode].messages);
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
      }
    });
  });
  socket.on("startgame", (data) => {
    const { username, roomCode } = data;
    if (rooms[roomCode]) {
      console.log(rooms[roomCode].users.length);
      let currentIndex = 0;
      let guser;
      const waitturn = () => {
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
          console.log(roomCode);
          console.log(currentUser.username);
          let slug = randomWordSlugs.generateSlug(1, {
            format: "title",
            partsOfSpeech: ["noun"],
          });
          let remainingTime = 20;

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
                  rooms[roomCode].raws[i] == slug &&
                  myMap[slug] != currentUser.username
                ) {
                  guser = myMap[slug];
                  io.to(roomCode).emit("abrupt", {
                    guser,
                    slug,
                  });
                  clearInterval(timerInterval);
                  let formattedMessage;
                  io.to(roomCode).emit("clearscore");
                  if (rooms[roomCode] != null) {
                    rooms[roomCode].score = [];
                    for (let i = 0; i < rooms[roomCode].users.length; i++) {
                      if (rooms[roomCode].users[i].username == guser)
                        rooms[roomCode].users[i].score = rooms[roomCode].users[i].score + remainingTime*5;
                      formattedMessage = `${rooms[roomCode].users[i].username}: ${rooms[roomCode].users[i].score}`;
                      rooms[roomCode].score.push(formattedMessage);
                    }
                  }
                  io.to(roomCode).emit("newscore", rooms[roomCode].score);
                  currentIndex++; // Move to the next user
                  waitturn();
                }
              }
            }
          }, 1000); // Update every 1000 milliseconds (1 second)
        }
      };
      let formattedMessage;
      io.to(roomCode).emit("clearscore");
      if (rooms[roomCode] != null) {
        rooms[roomCode].score = [];
        for (let i = 0; i < rooms[roomCode].users.length; i++) {
          if (rooms[roomCode].users[i].username == guser)
            rooms[roomCode].users[i].score = rooms[roomCode].users[i].score + remainingTime*5;
          formattedMessage = `${rooms[roomCode].users[i].username}: ${rooms[roomCode].users[i].score}`;
          rooms[roomCode].score.push(formattedMessage);
        }
      }
      io.to(roomCode).emit("newscore", rooms[roomCode].score);
      io.to(roomCode).emit("startturn");
      socket.emit('rev');
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
