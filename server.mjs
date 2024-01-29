const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
//const randomWords = require('random-words');
import { generateSlug } from "random-word-slugs";
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const rooms = {};
const delayInMilliseconds = 3000;
let rounds=0;
io.on('connection', (socket) => {
  socket.on('createRoom', (username) => {
    const roomCode = generateRoomCode();
    socket.join(roomCode);
    socket.emit('code', roomCode);
    rooms[roomCode] = { users: [{ id: socket.id, username, score: 0 }], messages: [] ,scoref:[]};
    io.to(roomCode).emit('showmessage', rooms[roomCode].users.map(user => user.username));
    io.to(roomCode).emit('updateUsers', rooms[roomCode].users.map(user => user.username));
    io.to(roomCode).emit('updateMessages', rooms[roomCode].messages);
  });

  socket.on('joinRoom', (data) => {
    const { roomCode, username } = data;
    if (rooms[roomCode]) {
      const userExists = rooms[roomCode].users.some(user => user.username === username);
      if (userExists) {
        socket.emit('roomError', 'Already Entered');
      } else {
        socket.join(roomCode);
        rooms[roomCode].users.push({ id: socket.id, username, score: 0 });
        io.to(roomCode).emit('showmessage', rooms[roomCode].users.map(user => user.username));
        io.to(roomCode).emit('updateUsers', rooms[roomCode].users.map(user => user.username));
        io.to(roomCode).emit('updateMessages', rooms[roomCode].messages);

      }
    } else {
      socket.emit('roomError', 'Room not found');
    }
  });
  socket.on('updateScore', (data) => {
    const roomCode = data.roomCode;
    let username = data.username;
    let formattedMessage;
    io.to(roomCode).emit('clearscore');
    if(rooms[roomCode] != null)
    {
      rooms[roomCode].score=[];
      for(let i=0;i<rooms[roomCode].users.length;i++)
      {
        if(rooms[roomCode].users[i].username==username)
        rooms[roomCode].users[i].score=rooms[roomCode].users[i].score+1;
        formattedMessage = `${rooms[roomCode].users[i].username}: ${rooms[roomCode].users[i].score}`;
        rooms[roomCode].score.push(formattedMessage);
      }
    }
    io.to(roomCode).emit('newscore', rooms[roomCode].score);
    
  });
  socket.on('draw', (data) => {
    const { roomCode, username, coordinates } = data;
    io.to(roomCode).emit('draw', { username, coordinates });
  });
  socket.on('canv', (data) => {
    const { roomCode, username } = data;
    io.to(roomCode).emit('can-create', { username });
  });
  
  socket.on('down', (data) => {
    const { roomCode, username, coordinates } = data;
    io.to(roomCode).emit('ondown', { username, coordinates });
  });
  

  socket.on('sendMessage', (data) => {
    const { roomCode, username, message } = data;
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `${timestamp} - ${username}: ${message}`;
    rooms[roomCode].messages.push(formattedMessage);
    io.to(roomCode).emit('updateMessages', rooms[roomCode].messages);
  });

  socket.on('disconnect', () => {
    Object.keys(rooms).forEach((roomCode) => {
      const index = rooms[roomCode].users.findIndex(user => user.id === socket.id);
      if (index !== -1) {
        rooms[roomCode].users.splice(index, 1);
        io.to(roomCode).emit('updateUsers', rooms[roomCode].users.map(user => user.username));
      }
    });
  });
  socket.on('startgame', (roomCode) => {
    if(rounds==3){
      console.log(rounds);
    }
    else{
      const slug = generateSlug();
      console.log(slug);
      const randomWord = slug
      console.log('Random Word:', randomWord);
      io.to(roomCode).emit(10,'printword');
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
