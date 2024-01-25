    let canvas=document.getElementById('canvas');
    canvas.width=window.innerWidth*0.98;
    canvas.height=window.innerHeight*0.5;
    let ctx=canvas.getContext('2d');
    let x;
    let y;
    let mousedown=false;

    window.onmousedown = (e) => {
      ctx.moveTo(x,y);
      mousedown=true;
    }
    window.onmouseup = (e) => {
      mousedown=false;
    }
    window.onmousemove = (e) => {
      x=e.clientX;
      y=e.clientY;
      if(mousedown)
      {
        ctx.lineTo(x,y);
        ctx.stroke();
      }
    }


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
    socket.emit('code',roomCode)
    rooms[roomCode] = { users: [username], messages: [] };
    io.to(roomCode).emit('showmessage', rooms[roomCode].users);
    io.to(roomCode).emit('updateUsers', rooms[roomCode].users);
    io.to(roomCode).emit('updateMessages', rooms[roomCode].messages);
  });

  socket.on('joinRoom', (data) => {
    const { roomCode, username } = data;
    if (rooms[roomCode]) {
      let flag=0;
      for(let i=0;i<rooms[roomCode].users.length;i++)
      {
        if(rooms[roomCode].users[i]==username)
        {
          flag=1;
        }
      }
      if(flag)
      socket.emit('roomError', 'Already Entered');
      else
      {
        socket.join(roomCode);
        rooms[roomCode].users.push(username);
        io.to(roomCode).emit('showmessage', rooms[roomCode].users);
        io.to(roomCode).emit('updateUsers', rooms[roomCode].users);
        io.to(roomCode).emit('updateMessages', rooms[roomCode].messages);
      }
    } else {
      socket.emit('roomError', 'Room not found');
    }
  });

  socket.on('Draw',(data) => {

  });
  socket.on('sendMessage', (data) => {
    let flag=0;
    const { roomCode, username, message } = data;
    for(let i=0;i<rooms[roomCode].users.length;i++)
    {
      if(rooms[roomCode].users[i]==username)
      {
        flag=1;
      }
    }
    if(flag)
    {
      const timestamp = new Date().toLocaleTimeString();
      const formattedMessage = `${timestamp} - ${username}: ${message}`;
      rooms[roomCode].messages.push(formattedMessage);
      io.to(roomCode).emit('updateMessages', rooms[roomCode].messages);
    }
  });

  socket.on('disconnect', () => {
    Object.keys(rooms).forEach((roomCode) => {
      const index = rooms[roomCode].users.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomCode].users.splice(index, 1);
        io.to(roomCode).emit('updateUsers', rooms[roomCode].users);
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
