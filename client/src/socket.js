// client/src/socket.js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: false, // Disable auto-reconnect for forced kicks
  reconnectionAttempts: 0,
  timeout: 10000,
});

export default socket;
