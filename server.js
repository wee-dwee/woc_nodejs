const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const rooms = {};

io.on('connection', (socket) => {
  socket.on('createRoom', (username) => {
    const roomCode = generateRoomCode();
    socket.join(roomCode);
    socket.emit('code', roomCode);
    rooms[roomCode] = { users: [{ id: socket.id, username }], messages: [] };
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
        rooms[roomCode].users.push({ id: socket.id, username });
        io.to(roomCode).emit('showmessage', rooms[roomCode].users.map(user => user.username));
        io.to(roomCode).emit('updateUsers', rooms[roomCode].users.map(user => user.username));
        io.to(roomCode).emit('updateMessages', rooms[roomCode].messages);
      }
    } else {
      socket.emit('roomError', 'Room not found');
    }
  });

  socket.on('draw', (data) => {
    const { roomCode, username, coordinates } = data;
    io.to(roomCode).emit('draw', { username, coordinates });
  });
  socket.on('canv', (data) => {
    const { roomCode, username } = data;
    console.log("$$");
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
});

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
