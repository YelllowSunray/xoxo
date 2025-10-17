// Simple WebRTC Signaling Server
// Run with: node signaling-server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "https://xoxo-kappa.vercel.app"], 
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Store active rooms and users
const rooms = new Map();
const users = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeRooms: rooms.size,
    activeUsers: users.size,
    timestamp: new Date().toISOString()
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Store user info
  users.set(socket.id, {
    id: socket.id,
    connectedAt: new Date()
  });

  // Handle joining a room
  socket.on('join-room', ({ roomId, userId }) => {
    console.log(`User ${userId} (${socket.id}) joining room: ${roomId}`);
    
    // Leave any existing room
    Array.from(socket.rooms).forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });
    
    // Join the new room
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        users: new Set(),
        createdAt: new Date()
      });
    }
    
    const room = rooms.get(roomId);
    room.users.add(socket.id);
    
    // Update user info
    const user = users.get(socket.id);
    if (user) {
      user.roomId = roomId;
      user.userId = userId;
    }
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', userId);
    
    console.log(`Room ${roomId} now has ${room.users.size} users`);
  });

  // Handle leaving a room
  socket.on('leave-room', ({ roomId, userId }) => {
    console.log(`User ${userId} (${socket.id}) leaving room: ${roomId}`);
    
    socket.leave(roomId);
    
    const room = rooms.get(roomId);
    if (room) {
      room.users.delete(socket.id);
      
      // Clean up empty rooms
      if (room.users.size === 0) {
        rooms.delete(roomId);
        console.log(`Deleted empty room: ${roomId}`);
      } else {
        // Notify others in the room
        socket.to(roomId).emit('user-left', userId);
      }
    }
    
    // Update user info
    const user = users.get(socket.id);
    if (user) {
      delete user.roomId;
      delete user.userId;
    }
  });

  // Handle signaling messages (offer, answer, ice-candidate)
  socket.on('message', (message) => {
    const { roomId, type, data } = message;
    
    if (!roomId) {
      console.error('Message received without roomId:', message);
      return;
    }
    
    console.log(`Relaying ${type} message in room ${roomId}`);
    
    // Relay the message to all other users in the room
    socket.to(roomId).emit('message', {
      ...message,
      from: socket.id
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
    
    const user = users.get(socket.id);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room) {
        room.users.delete(socket.id);
        
        // Notify others in the room
        if (user.userId) {
          socket.to(user.roomId).emit('user-left', user.userId);
        }
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(user.roomId);
          console.log(`Deleted empty room: ${user.roomId}`);
        }
      }
    }
    
    // Remove user
    users.delete(socket.id);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Periodic cleanup of stale rooms (optional)
setInterval(() => {
  const now = new Date();
  const staleThreshold = 60 * 60 * 1000; // 1 hour
  
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > staleThreshold && room.users.size === 0) {
      rooms.delete(roomId);
      console.log(`Cleaned up stale room: ${roomId}`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
