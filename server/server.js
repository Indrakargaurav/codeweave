// server/server.js
require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const app = require('./app');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// In-memory store of active rooms
const activeRooms = new Set();
// Track users per room: { [roomId]: [{ id, username }] }
const usersPerRoom = {};

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-room', ({ roomId, username }) => {
    // Remove activeRooms check
    // if (!activeRooms.has(roomId)) {
    //   socket.emit("join-error", "Room not found or access denied.");
    //   socket.disconnect();
    //   return;
    // }

    socket.join(roomId);
    console.log(`🟢 ${username} (${socket.id}) joined room ${roomId}`);

    // Add user to usersPerRoom
    if (!usersPerRoom[roomId]) usersPerRoom[roomId] = [];
    // Mark as owner if first user in the room
    const isOwner = usersPerRoom[roomId].length === 0;
    usersPerRoom[roomId].push({ id: socket.id, username, isOwner });

    // Notify others in the room
    socket.to(roomId).emit('user-joined', { id: socket.id, username });

    // Send current users list (with usernames and isOwner)
    io.to(roomId).emit('user-list', usersPerRoom[roomId]);

    socket.on('code-change', (payload) => {
      // Debug log for code sync
      console.log('[SOCKET] code-change received:', payload);
      // Forward all fields to the room
      if (payload && payload.roomId) {
        socket.to(payload.roomId).emit('code-update', payload);
        console.log('[SOCKET] code-update emitted to room:', payload.roomId, payload);
      }
    });

    socket.on('file-tree-change', (payload) => {
      console.log('[SOCKET] file-tree-change received:', payload);
      if (payload && payload.roomId) {
        socket.to(payload.roomId).emit('file-tree-change', payload);
        console.log('[SOCKET] file-tree-change emitted to room:', payload.roomId);
      }
    });

    socket.on('file-tree-and-tabs-change', (payload) => {
      console.log('[SOCKET] file-tree-and-tabs-change received:', payload);
      if (payload && payload.roomId) {
        socket.to(payload.roomId).emit('file-tree-and-tabs-change', payload);
        console.log('[SOCKET] file-tree-and-tabs-change emitted to room:', payload.roomId);
      }
    });

    // Chat functionality: relay chat messages to the room
    socket.on('chat-message', (msg) => {
      if (msg && msg.roomId) {
        socket.to(msg.roomId).emit('chat-message', msg);
      }
    });

    // Handle leave-room event
    socket.on('leave-room', ({ roomId: leaveRoomId }) => {
      if (usersPerRoom[leaveRoomId]) {
        // Check if the leaver is the owner
        const wasOwner = usersPerRoom[leaveRoomId].ownerSocketId === socket.id;
        usersPerRoom[leaveRoomId] = usersPerRoom[leaveRoomId].filter((u) => u.id !== socket.id);
        io.to(leaveRoomId).emit('user-list', {
          users: usersPerRoom[leaveRoomId],
          ownerSocketId: usersPerRoom[leaveRoomId].ownerSocketId,
        });
        socket.to(leaveRoomId).emit('user-left', { id: socket.id, username });
        socket.leave(leaveRoomId);
        // If the owner left, force-redirect all remaining users
        if (wasOwner && usersPerRoom[leaveRoomId].length > 0) {
          usersPerRoom[leaveRoomId].forEach((user) => {
            const clientSocket = io.sockets.sockets.get(user.id);
            if (clientSocket) {
              clientSocket.emit('force-redirect', {
                url: '/dashboard',
                message: 'Room owner left. Room closed for development.',
              });
              setTimeout(() => clientSocket.disconnect(true), 100);
            }
          });
          usersPerRoom[leaveRoomId] = [];
        }
        // In leave-room and disconnect, if the owner leaves, update ownerSocketId to the next user if any
        if (usersPerRoom[leaveRoomId].length === 0) {
          delete usersPerRoom[leaveRoomId];
        }
      }
    });

    // Handle shutdown-room event (owner only)
    socket.on('shutdown-room', ({ roomId }) => {
      if (usersPerRoom[roomId]) {
        // Find the owner (the sender of the event)
        const ownerId = socket.id;
        // Notify all users except the owner
        usersPerRoom[roomId].forEach((user) => {
          if (user.id !== ownerId) {
            const clientSocket = io.sockets.sockets.get(user.id);
            if (clientSocket) {
              clientSocket.emit('force-redirect', {
                url: '/dashboard',
                message: 'Room closed for development',
              });
              clientSocket.leave(roomId);
              setTimeout(() => clientSocket.disconnect(true), 100); // Give time for event to reach client
            }
          }
        });
        // Remove all users except the owner from usersPerRoom
        usersPerRoom[roomId] = usersPerRoom[roomId].filter((u) => u.id === ownerId);
        // Update user list for the owner
        io.to(roomId).emit('user-list', usersPerRoom[roomId]);
      }
    });

    // Also handle disconnect event for the owner
    socket.on('disconnect', () => {
      for (const rid in usersPerRoom) {
        const wasOwner = usersPerRoom[rid].ownerSocketId === socket.id;
        usersPerRoom[rid] = usersPerRoom[rid].filter((u) => u.id !== socket.id);
        if (wasOwner && usersPerRoom[rid].length > 0) {
          usersPerRoom[rid].ownerSocketId = usersPerRoom[rid][0].id;
        }
        io.to(rid).emit('user-list', {
          users: usersPerRoom[rid],
          ownerSocketId: usersPerRoom[rid].ownerSocketId,
        });
        socket.to(rid).emit('user-left', { id: socket.id, username });
        if (usersPerRoom[rid].length === 0) {
          delete usersPerRoom[rid];
        }
      }
    });
  });
});

// Room creation is now handled by the /api/room/create route with authentication

// Connect DB and start server
connectDB()
  .then(() => {
    console.log('✅ MongoDB connected, starting server...');
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ DB connection error:', err.message);
    process.exit(1);
  });
