const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const rooms = {};

io.on('connection', (socket) => {
  socket.on('joinRoom', (data) => {
    const { username, roomCode } = data;
    socket.join(roomCode);

    if (!rooms[roomCode]) {
      rooms[roomCode] = { users: [] };
    }

    rooms[roomCode].users.push({ id: socket.id, username });

    io.to(roomCode).emit('updateUsers', rooms[roomCode].users);
    socket.emit('message', { user: 'system', text: `Welcome, ${username}!` });
    socket.broadcast.to(roomCode).emit('message', { user: 'system', text: `${username} has joined the room.` });
  });

  socket.on('sendMessage', (data) => {
    const { roomCode, message } = data;
    io.to(roomCode).emit('message', { user: socket.id, text: message });
  });

  socket.on('draw', (data) => {
    const { roomCode, drawing } = data;
    socket.broadcast.to(roomCode).emit('draw', drawing);
  });

  socket.on('disconnect', () => {
    Object.keys(rooms).forEach((roomCode) => {
      const userIndex = rooms[roomCode].users.findIndex((user) => user.id === socket.id);
      if (userIndex !== -1) {
        const { username } = rooms[roomCode].users[userIndex];
        rooms[roomCode].users.splice(userIndex, 1);
        io.to(roomCode).emit('updateUsers', rooms[roomCode].users);
        io.to(roomCode).emit('message', { user: 'system', text: `${username} has left the room.` });
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});