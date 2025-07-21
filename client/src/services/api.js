import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL ? `${process.env.REACT_APP_API_BASE_URL}/api` : 'http://localhost:5000/api';

export async function loginUser(credentials) {
  return axios.post(`${API_BASE}/auth/login`, credentials);
}

export async function registerUser(data) {
  return axios.post(`${API_BASE}/auth/register`, data);
}

// Add this:
export async function fetchUserRooms() {
  return axios.get(`${API_BASE}/rooms/user`); // example endpoint to get current user's rooms
}

// Add this:
export async function shutRoom(roomId) {
  return axios.post(`${API_BASE}/rooms/${roomId}/shut`); // example endpoint to shut a room
}
