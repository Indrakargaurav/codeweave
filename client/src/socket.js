// client/src/socket.js
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_BASE_URL, {
  transports: ['websocket'],
  reconnection: false, // Disable auto-reconnect for forced kicks
  reconnectionAttempts: 0,
  timeout: 10000,
});

export default socket;
