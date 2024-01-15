import { io } from 'socket.io-client'

const socket=io("http://localhost:3000")

socket.on('connect',() =>{
    console.log(`You connected with id: ${socket.id}`)
    socket.emit("custom-event",10,"Hi",{a:"a"})
})

