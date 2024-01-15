const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join', ({ username, room }) => {
    // Handle joining a room
    socket.join(room);
    socket.emit('message', `Welcome to ${room}, ${username}!`);
  });

  socket.on('chatMessage', (msg) => {
    // Broadcast message to everyone in the room
    io.to(msg.room).emit('message', `${msg.username}: ${msg.text}`);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
